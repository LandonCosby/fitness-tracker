import { FontSize, FontWeight, Space } from '@/constants/Design';
import HeaderAction from '@/components/HeaderAction';
import MacroPills from '@/components/nutrition/MacroPills';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import { FormSkeleton } from '@/components/ScreenSkeletons';
import IconButton from '@/components/IconButton';
import ModalScreen from '@/components/ModalScreen';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { Button, Card } from '@/components/ui';
import { deleteFood, getFood, type SavedFood } from '@/db/nutrition';
import { getRecipe, recipeTotals, saveRecipe, type RecipeIngredient } from '@/db/recipes';
import { openIngredientPicker } from '@/lib/foodPicker';
import { formatCalories, formatNumber } from '@/lib/format';

type Row = {
  key: string;
  food: SavedFood;
  /** Grams for foods with a serving weight, otherwise servings, as typed. */
  amount: string;
};

const MAX_SERVINGS = 50;

function parse(text: string): number | null {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

const byWeight = (food: SavedFood) => food.servingGrams != null;

// The amount as servings of the ingredient (what recipe_items stores).
function rowServings(row: Row): number | null {
  const value = parse(row.amount);
  if (value == null) return null;
  return byWeight(row.food) ? value / row.food.servingGrams! : value;
}

// Create a meal from ingredients (a recipe), or edit one with ?id=.
export default function RecipeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const isEditing = id != null;

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [servingsMade, setServingsMade] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const allowLeave = useUnsavedChanges(JSON.stringify({ name, servingsMade, ingredients: rows.map(({ food, amount }) => [food.id, amount]) }), loaded);
  const nextKey = useRef(0);
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');

  const makeRow = (food: SavedFood, servings: number): Row => ({
    key: String(nextKey.current++),
    food,
    amount: formatNumber(
      byWeight(food) ? Math.round(food.servingGrams! * servings) : Math.round(servings * 100) / 100
    ),
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getRecipe(db, id).then((recipe) => {
      if (cancelled) return;
      if (!recipe) {
        router.back();
        return;
      }
      setName(recipe.name);
      setServingsMade(recipe.servingsMade);
      setRows(recipe.ingredients.map((item) => makeRow(item.food, item.servings)));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const addIngredient = () => {
    openIngredientPicker(async (foodId) => {
      const food = await getFood(db, foodId);
      if (!food) return;
      setRows((current) => [...current, makeRow(food, 1)]);
      setError(null);
    });
  };

  const ingredients: RecipeIngredient[] = rows.flatMap((row) => {
    const servings = rowServings(row);
    return servings != null ? [{ food: row.food, servings }] : [];
  });
  const totals = recipeTotals(ingredients);
  const per = (value: number) => value / servingsMade;

  const save = async () => {
    if (!name.trim()) return setError('Enter a name for the meal.');
    if (rows.length === 0) return setError('Add at least one ingredient.');
    if (ingredients.length !== rows.length) return setError('Every ingredient needs an amount.');
    setSaving(true);
    try {
      await saveRecipe(db, { name, servingsMade, ingredients }, id);
      allowLeave();
      router.back();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    showAlert(`Delete "${name}"?`, 'Days you already logged it on are not changed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFood(db, id);
          allowLeave();
          router.back();
        },
      },
    ]);
  };

  const title = isEditing ? 'Edit meal' : 'Create meal';
  if (!loaded)
    return (
      <ModalScreen title={title}>
        <FormSkeleton fields={3} />
      </ModalScreen>
    );

  return (
    <ModalScreen
      title={title}
      right={<HeaderAction label="Save" onPress={save} disabled={saving} />}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.field}>
          <Text style={styles.label}>Meal name</Text>
          <TextInput
            value={name}
            accessibilityLabel="Meal name"
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="e.g. Chicken rice bowl"
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ingredients</Text>
          {rows.length === 0 && (
            <Text style={[styles.hint, { color: muted }]}>
              Add each ingredient and how much of it goes in. Amounts are in grams when the
              ingredient&apos;s weight is known, otherwise in servings.
            </Text>
          )}
          {rows.map((row) => {
            const servings = rowServings(row);
            const kcal = servings != null ? row.food.calories * servings : null;
            return (
              <Card key={row.key} style={styles.ingredient}>
                <View style={styles.ingredientText}>
                  <Text style={styles.ingredientName} numberOfLines={2}>
                    {row.food.name}
                  </Text>
                  <Text style={[styles.hint, { color: muted }]}>
                    {kcal != null ? `${formatCalories(kcal)} kcal` : 'Enter an amount'}
                    {!byWeight(row.food) && row.food.servingLabel ? ` · serving: ${row.food.servingLabel}` : ''}
                  </Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  value={row.amount}
                  onChangeText={(text) => {
                    const clean = text.replace(/[^0-9.,]/g, '');
                    setRows((current) => current.map((r) => (r.key === row.key ? { ...r, amount: clean } : r)));
                  }}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  selectTextOnFocus
                  accessibilityLabel={`${row.food.name} amount in ${byWeight(row.food) ? 'grams' : 'servings'}`}
                />
                <Text style={[styles.amountUnit, { color: muted }]}>
                  {byWeight(row.food) ? 'g' : 'srv'}
                </Text>
                <IconButton
                  ios="xmark"
                  material="close"
                  label={`Remove ${row.food.name}`}
                  color="muted"
                  onPress={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                />
              </Card>
            );
          })}
          <Button label="+ Add ingredient" variant="soft" onPress={addIngredient} />
        </View>

        <Card style={styles.servingsCard}>
          <Text style={styles.label}>Makes</Text>
          <View style={styles.stepper}>
            <IconButton
              ios="minus.circle.fill"
              material="remove_circle"
              label="Fewer servings"
              color="tint"
              size={30}
              onPress={() => setServingsMade((n) => Math.max(1, n - 1))}
              disabled={servingsMade <= 1}
            />
            <Text style={styles.servingsValue} accessibilityLiveRegion="polite">
              {servingsMade} {servingsMade === 1 ? 'serving' : 'servings'}
            </Text>
            <IconButton
              ios="plus.circle.fill"
              material="add_circle"
              label="More servings"
              color="tint"
              size={30}
              onPress={() => setServingsMade((n) => Math.min(MAX_SERVINGS, n + 1))}
              disabled={servingsMade >= MAX_SERVINGS}
            />
          </View>
        </Card>

        <Card style={styles.totals}>
          <TotalsRow
            label="Per serving"
            strong
            calories={per(totals.calories)}
            protein={per(totals.proteinG)}
            carbs={per(totals.carbsG)}
            fat={per(totals.fatG)}
            grams={totals.grams != null ? per(totals.grams) : null}
          />
          {servingsMade > 1 && (
            <TotalsRow
              label="Whole recipe"
              calories={totals.calories}
              protein={totals.proteinG}
              carbs={totals.carbsG}
              fat={totals.fatG}
              grams={totals.grams}
            />
          )}
          {totals.grams == null && rows.length > 0 && (
            <Text style={[styles.hint, { color: muted }]}>
              Some ingredients have no weight, so this meal can only be logged in servings.
            </Text>
          )}
        </Card>

        {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}

        <Button label={isEditing ? 'Save changes' : 'Save meal'} onPress={save} disabled={saving} />
        {isEditing && <Button label="Delete meal" variant="danger" onPress={confirmDelete} />}
        <Text style={[styles.hint, styles.center, { color: muted }]}>
          Saved meals appear in the <Text style={{ color: tint }}>Custom</Text> tab.
        </Text>
      </ScrollView>
    </ModalScreen>
  );
}

function TotalsRow({
  label,
  calories,
  protein,
  carbs,
  fat,
  grams,
  strong = false,
}: {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number | null;
  strong?: boolean;
}) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.totalsRow}>
      <View style={styles.totalsHeader}>
        <Text style={[styles.totalsLabel, { color: muted }]}>
          {label.toUpperCase()}
          {grams != null ? ` · ${Math.round(grams)} g` : ''}
        </Text>
        <Text style={[styles.totalsCalories, strong && styles.totalsCaloriesStrong]}>
          {formatCalories(calories)} kcal
        </Text>
      </View>
      <MacroPills values={{ proteinG: protein, carbsG: carbs, fatG: fat }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
    gap: Space.lg,
    paddingBottom: Space.bottom,
  },
  field: {
    gap: Space.sm,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  hint: {
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
  center: {
    textAlign: 'center',
  },
  ingredient: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.md,
  },
  ingredientText: {
    flexGrow: 1,
    flexBasis: 150,
    gap: Space.micro,
  },
  ingredientName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  amountInput: {
    width: 70,
    textAlign: 'center',
    paddingVertical: Space.sm,
    paddingHorizontal: Space.sm,
    fontWeight: FontWeight.bold,
  },
  amountUnit: {
    width: 26,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  servingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  servingsValue: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
    minWidth: 100,
    textAlign: 'center',
  },
  totals: {
    gap: Space.md,
  },
  totalsRow: {
    gap: Space.micro,
  },
  totalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalsLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  totalsCalories: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
  totalsCaloriesStrong: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.heavy,
  },
  error: {
    fontSize: FontSize.body,
  },
});
