import type { SQLiteDatabase } from 'expo-sqlite';

import { now } from './records';
import { getSetting, setSetting } from './settings';
import type { FoodCategory } from './types';

// Built-in foods for the Add food tabs: Ingredients, Fast food and Meals. (Custom is the
// user's own.) Values are typical per-serving numbers: ingredients and meals from standard
// nutrition tables, fast food from the chains' published US nutrition info. All approximate;
// recipes and menus change. They behave like saved foods: long press removes one.
//
// Ingredients and meals carry a serving weight in grams so they can be logged by weight.
//
// Re-running after a version bump inserts new foods and refreshes category, brand and serving
// weight on existing built-ins, but never brings back one the user removed (deleted_at is
// left alone). 1: first ingredient list. 2: tabs, weights, fast food and meals.
const FOOD_SEED_VERSION = 2;
const SEED_VERSION_KEY = 'food_seed_version';
export const BUILT_IN_FOOD_PREFIX = 'builtin-food:';

// [name, serving, grams per serving, kcal, protein g, carbs g, fat g]
type Item = [string, string, number | null, number, number, number, number];

const INGREDIENTS: Item[] = [
  // Protein
  ['Chicken breast, cooked', '4 oz (112 g)', 112, 187, 35, 0, 4],
  ['Chicken thigh, skinless, cooked', '4 oz (112 g)', 112, 200, 28, 0, 9],
  ['Ground beef 90% lean, cooked', '4 oz (112 g)', 112, 225, 29, 0, 12],
  ['Ground beef 80% lean, cooked', '4 oz (112 g)', 112, 290, 29, 0, 19],
  ['Ground turkey 93% lean, cooked', '4 oz (112 g)', 112, 200, 27, 0, 10],
  ['Sirloin steak, cooked', '4 oz (112 g)', 112, 230, 34, 0, 9.5],
  ['Pork chop, cooked', '4 oz (112 g)', 112, 230, 31, 0, 11],
  ['Salmon, cooked', '4 oz (112 g)', 112, 233, 25, 0, 14],
  ['Tilapia, cooked', '4 oz (112 g)', 112, 145, 30, 0, 3],
  ['Tuna, canned in water', '3 oz (85 g)', 85, 99, 22, 0, 0.7],
  ['Shrimp, cooked', '3 oz (85 g)', 85, 84, 20, 0, 0.3],
  ['Turkey breast, deli sliced', '2 oz (56 g)', 56, 60, 11, 1, 1],
  ['Bacon, cooked', '2 slices', 16, 86, 6, 0.2, 6.6],
  ['Beef jerky', '1 oz (28 g)', 28, 116, 9.4, 3.1, 7.3],
  ['Egg, large', '1 egg', 50, 72, 6.3, 0.4, 4.8],
  ['Egg white, large', '1 egg white', 33, 17, 3.6, 0.2, 0.1],
  ['Tofu, firm', '½ cup (126 g)', 126, 181, 22, 3.5, 11],
  ['Whey protein powder', '1 scoop (30 g)', 30, 120, 24, 3, 1.5],
  ['Protein bar', '1 bar (60 g)', 60, 200, 20, 22, 7],

  // Dairy
  ['Greek yogurt, plain nonfat', '170 g container', 170, 100, 17, 6, 0.7],
  ['Cottage cheese, 2%', '½ cup', 113, 92, 12, 5, 2.5],
  ['Milk, 2%', '1 cup', 244, 122, 8, 12, 4.8],
  ['Milk, skim', '1 cup', 245, 83, 8.3, 12, 0.2],
  ['Almond milk, unsweetened', '1 cup', 240, 30, 1, 1, 2.5],
  ['Cheddar cheese', '1 oz (28 g)', 28, 115, 6.5, 0.4, 9.4],
  ['Mozzarella, part-skim', '1 oz (28 g)', 28, 72, 6.9, 0.8, 4.5],
  ['Parmesan, grated', '1 tbsp', 5, 21, 1.9, 0.7, 1.4],
  ['String cheese', '1 stick', 28, 80, 7, 1, 5],
  ['Cream cheese', '1 tbsp', 15, 51, 0.9, 0.8, 5],
  ['Sour cream', '2 tbsp', 24, 57, 0.7, 1.3, 5.6],
  ['Heavy cream', '1 tbsp', 15, 51, 0.4, 0.4, 5.4],
  ['Butter', '1 tbsp', 14, 102, 0.1, 0, 11.5],

  // Grains and starches
  ['Oatmeal, dry oats', '½ cup (40 g)', 40, 150, 5, 27, 3],
  ['White rice, cooked', '1 cup', 158, 205, 4.3, 45, 0.4],
  ['White rice, dry', '¼ cup', 46, 166, 3.3, 37, 0.3],
  ['Brown rice, cooked', '1 cup', 195, 218, 4.5, 46, 1.6],
  ['Pasta, cooked', '1 cup', 140, 220, 8, 43, 1.3],
  ['Pasta, dry', '2 oz (56 g)', 56, 200, 7, 42, 1],
  ['Quinoa, cooked', '1 cup', 185, 222, 8, 39, 3.6],
  ['All-purpose flour', '¼ cup', 31, 114, 3.2, 24, 0.3],
  ['Whole wheat bread', '1 slice', 32, 80, 4, 14, 1],
  ['White bread', '1 slice', 28, 75, 2.6, 14, 1],
  ['Bagel, plain', '1 medium', 105, 270, 10.5, 53, 1.5],
  ['Flour tortilla', '1 medium (8")', 49, 140, 4, 24, 3.5],
  ['Corn tortilla', '1 tortilla', 26, 52, 1.4, 10.7, 0.7],
  ['Corn flakes', '1 cup', 28, 100, 2, 24, 0],
  ['Rice cake, plain', '1 cake', 9, 35, 0.7, 7.3, 0.3],
  ['Potato, baked', '1 medium', 173, 161, 4.3, 37, 0.2],
  ['Sweet potato, baked', '1 medium', 114, 103, 2.3, 24, 0.2],

  // Fruit
  ['Banana', '1 medium', 118, 105, 1.3, 27, 0.4],
  ['Apple', '1 medium', 182, 95, 0.5, 25, 0.3],
  ['Orange', '1 medium', 131, 62, 1.2, 15.4, 0.2],
  ['Blueberries', '1 cup', 148, 84, 1.1, 21, 0.5],
  ['Strawberries', '1 cup', 152, 49, 1, 12, 0.5],
  ['Grapes', '1 cup', 151, 104, 1.1, 27, 0.2],
  ['Avocado', '½ fruit', 75, 120, 1.5, 6.4, 11],

  // Vegetables and legumes
  ['Broccoli, cooked', '1 cup', 156, 55, 3.7, 11, 0.6],
  ['Green beans, cooked', '1 cup', 125, 44, 2.4, 10, 0.4],
  ['Spinach, raw', '2 cups', 60, 14, 1.7, 2.2, 0.2],
  ['Mixed salad greens', '2 cups', 60, 15, 1, 3, 0],
  ['Carrot', '1 medium', 61, 25, 0.6, 6, 0.1],
  ['Onion', '1 medium', 110, 44, 1.2, 10.3, 0.1],
  ['Tomato', '1 medium', 123, 22, 1.1, 4.8, 0.2],
  ['Bell pepper', '1 medium', 119, 37, 1.2, 7.2, 0.4],
  ['Mushrooms, sliced', '1 cup', 70, 15, 2.2, 2.3, 0.2],
  ['Cucumber, sliced', '1 cup', 104, 16, 0.7, 3.8, 0.1],
  ['Garlic', '1 clove', 3, 4, 0.2, 1, 0],
  ['Sweet corn, cooked', '1 cup', 145, 134, 5, 31, 2],
  ['Green peas, cooked', '1 cup', 160, 125, 8, 23, 0.4],
  ['Black beans, cooked', '½ cup', 86, 114, 7.6, 20, 0.5],
  ['Chickpeas, cooked', '½ cup', 82, 134, 7.3, 22.5, 2.1],
  ['Lentils, cooked', '½ cup', 99, 115, 9, 20, 0.4],
  ['Edamame, shelled', '1 cup', 155, 188, 18.4, 13.8, 8.1],

  // Nuts, seeds and fats
  ['Peanut butter', '2 tbsp', 32, 190, 7, 7, 16],
  ['Almonds', '1 oz (23 nuts)', 28, 164, 6, 6, 14],
  ['Cashews', '1 oz (28 g)', 28, 157, 5.2, 8.6, 12.4],
  ['Walnuts', '1 oz (28 g)', 28, 185, 4.3, 3.9, 18.5],
  ['Chia seeds', '1 tbsp', 12, 58, 2, 5, 3.7],
  ['Olive oil', '1 tbsp', 14, 119, 0, 0, 13.5],

  // Condiments and baking
  ['Hummus', '2 tbsp', 30, 70, 2, 4, 5],
  ['Honey', '1 tbsp', 21, 64, 0, 17, 0],
  ['Sugar', '1 tbsp', 12.5, 48, 0, 12.5, 0],
  ['Mayonnaise', '1 tbsp', 14, 94, 0.1, 0.1, 10.3],
  ['Ketchup', '1 tbsp', 17, 20, 0.2, 5, 0],
  ['Ranch dressing', '2 tbsp', 30, 129, 0.4, 1.8, 13.4],
  ['Salsa', '2 tbsp', 32, 10, 0.5, 2, 0],

  // Snacks and treats
  ['Popcorn, air-popped', '3 cups', 24, 93, 3, 19, 1],
  ['Potato chips', '1 oz (28 g)', 28, 152, 2, 15, 10],
  ['Dark chocolate, 70–85%', '1 oz (28 g)', 28, 170, 2.2, 13, 12],
  ['Ice cream, vanilla', '½ cup', 66, 137, 2.3, 16, 7.3],

  // Drinks (grams ≈ millilitres)
  ['Coffee, black', '1 cup', 237, 2, 0.3, 0, 0],
  ['Orange juice', '1 cup', 248, 112, 1.7, 26, 0.5],
  ['Cola', '12 oz can', 368, 140, 0, 39, 0],
  ['Beer, regular', '12 oz', 356, 153, 1.6, 13, 0],
];

const MEALS: Item[] = [
  // Two foods from the first ingredient list (v1) that are really meals.
  ['Cheese pizza', '1 slice (14")', 107, 285, 12, 36, 10],
  ['Cheeseburger', '1 sandwich', 120, 300, 15, 33, 12],

  // Breakfast
  ['Scrambled eggs (3) with toast', '1 plate', 230, 420, 24, 27, 23],
  ['Pancakes with syrup', '3 pancakes', 230, 520, 10, 92, 12],
  ['Oatmeal with banana & peanut butter', '1 bowl', 330, 450, 14, 64, 17],
  ['Greek yogurt parfait with granola & berries', '1 cup', 250, 330, 20, 48, 7],
  ['Avocado toast with egg', '1 slice', 150, 300, 12, 22, 18],
  ['Protein shake with milk & banana', '1 shake', 480, 390, 35, 46, 7],

  // Sandwiches and handhelds
  ['Turkey sandwich', '1 sandwich', 220, 350, 25, 38, 10],
  ['Grilled cheese sandwich', '1 sandwich', 110, 380, 14, 30, 23],
  ['Peanut butter & jelly sandwich', '1 sandwich', 100, 380, 13, 48, 16],
  ['BLT sandwich', '1 sandwich', 150, 360, 14, 32, 20],
  ['Tuna salad sandwich', '1 sandwich', 200, 470, 24, 34, 26],
  ['Beef tacos', '2 tacos', 200, 420, 22, 30, 23],
  ['Chicken burrito', '1 burrito', 350, 650, 38, 70, 22],
  ['Chicken quesadilla', '1 quesadilla', 250, 620, 35, 42, 34],

  // Plates and bowls
  ['Spaghetti with meat sauce', '1½ cups', 375, 490, 25, 60, 16],
  ['Chicken Alfredo pasta', '1½ cups', 330, 760, 38, 70, 36],
  ['Lasagna', '1 piece', 250, 400, 24, 35, 18],
  ['Mac and cheese, homemade', '1 cup', 200, 450, 17, 45, 22],
  ['Chicken stir-fry with rice', '1 plate', 400, 520, 35, 62, 13],
  ['Beef & broccoli with rice', '1 plate', 400, 560, 31, 66, 17],
  ['Chicken fried rice', '1½ cups', 300, 470, 20, 60, 16],
  ['Burrito bowl (chicken, rice, beans)', '1 bowl', 450, 640, 45, 75, 17],
  ['Salmon, rice & broccoli', '1 plate', 400, 560, 36, 52, 21],
  ['Steak & baked potato', '1 plate', 400, 640, 45, 45, 30],
  ['Meatloaf with mashed potatoes', '1 plate', 350, 520, 30, 38, 27],
  ['Pot roast with vegetables', '1 plate', 350, 420, 38, 22, 19],
  ['Chicken wings', '8 wings', 240, 640, 54, 2, 46],

  // Soups and salads
  ['Chicken noodle soup', '1½ cups', 360, 190, 13, 21, 6],
  ['Beef chili', '1½ cups', 380, 410, 29, 33, 17],
  ['Grilled chicken salad', '1 bowl', 300, 350, 35, 12, 18],
  ['Chicken Caesar salad', '1 bowl', 300, 470, 35, 14, 31],
];

// [restaurant, item, serving, kcal, protein g, carbs g, fat g]
type MenuItem = [string, string, string, number, number, number, number];

const FAST_FOOD: MenuItem[] = [
  ["McDonald's", 'Big Mac', '1 sandwich', 590, 25, 46, 34],
  ["McDonald's", 'Quarter Pounder with Cheese', '1 sandwich', 520, 30, 42, 26],
  ["McDonald's", 'Cheeseburger', '1 sandwich', 300, 15, 32, 13],
  ["McDonald's", 'McChicken', '1 sandwich', 400, 14, 39, 21],
  ["McDonald's", 'Filet-O-Fish', '1 sandwich', 390, 16, 39, 19],
  ["McDonald's", 'Chicken McNuggets', '10 pieces', 410, 23, 25, 24],
  ["McDonald's", 'French Fries', 'Medium', 320, 5, 43, 15],
  ["McDonald's", 'Egg McMuffin', '1 sandwich', 310, 17, 30, 13],
  ["McDonald's", 'Hash Browns', '1 piece', 140, 1, 16, 8],
  ["McDonald's", 'McFlurry with Oreo Cookies', 'Regular', 510, 12, 80, 16],

  ['Burger King', 'Whopper', '1 sandwich', 660, 28, 49, 40],
  ['Burger King', 'Whopper Jr.', '1 sandwich', 310, 13, 27, 18],
  ['Burger King', 'Impossible Whopper', '1 sandwich', 630, 25, 58, 34],
  ['Burger King', 'Original Chicken Sandwich', '1 sandwich', 670, 28, 58, 37],
  ['Burger King', 'Chicken Fries', '9 pieces', 280, 13, 20, 17],
  ['Burger King', 'French Fries', 'Medium', 380, 5, 53, 17],
  ['Burger King', 'Onion Rings', 'Medium', 410, 6, 50, 21],

  ["Wendy's", "Dave's Single", '1 sandwich', 590, 29, 39, 37],
  ["Wendy's", 'Baconator', '1 sandwich', 960, 57, 37, 66],
  ["Wendy's", 'Spicy Chicken Sandwich', '1 sandwich', 500, 29, 51, 20],
  ["Wendy's", 'Crispy Chicken Nuggets', '10 pieces', 420, 22, 25, 27],
  ["Wendy's", 'French Fries', 'Medium', 350, 5, 47, 16],
  ["Wendy's", 'Chili', 'Small', 240, 16, 22, 8],
  ["Wendy's", 'Chocolate Frosty', 'Small', 350, 9, 56, 9],

  ['Chick-fil-A', 'Chick-fil-A Chicken Sandwich', '1 sandwich', 440, 28, 41, 17],
  ['Chick-fil-A', 'Spicy Chicken Sandwich', '1 sandwich', 450, 28, 42, 19],
  ['Chick-fil-A', 'Grilled Chicken Sandwich', '1 sandwich', 390, 28, 44, 11],
  ['Chick-fil-A', 'Chicken Nuggets', '8 count', 250, 27, 11, 11],
  ['Chick-fil-A', 'Grilled Nuggets', '12 count', 200, 38, 2, 4.5],
  ['Chick-fil-A', 'Waffle Potato Fries', 'Medium', 420, 5, 45, 24],
  ['Chick-fil-A', 'Chicken Biscuit', '1 biscuit', 460, 19, 45, 23],
  ['Chick-fil-A', 'Mac & Cheese', 'Medium', 450, 20, 29, 29],

  ['Popeyes', 'Classic Chicken Sandwich', '1 sandwich', 700, 28, 50, 42],
  ['Popeyes', 'Spicy Chicken Sandwich', '1 sandwich', 700, 28, 50, 42],
  ['Popeyes', 'Chicken Tenders', '3 pieces', 450, 37, 27, 22],
  ['Popeyes', 'Chicken Breast, mild', '1 piece', 380, 35, 16, 20],
  ['Popeyes', 'Cajun Fries', 'Regular', 270, 3, 34, 13],
  ['Popeyes', 'Red Beans & Rice', 'Regular', 250, 8, 30, 11],
  ['Popeyes', 'Biscuit', '1 biscuit', 210, 3, 26, 10],

  ['KFC', 'Original Recipe Chicken Breast', '1 piece', 390, 39, 11, 21],
  ['KFC', 'Extra Crispy Chicken Breast', '1 piece', 530, 35, 18, 35],
  ['KFC', 'Famous Bowl', '1 bowl', 720, 26, 79, 34],
  ['KFC', 'KFC Chicken Sandwich', '1 sandwich', 650, 34, 49, 35],
  ['KFC', 'Mashed Potatoes & Gravy', 'Individual', 130, 3, 19, 4.5],
  ['KFC', 'Mac & Cheese', 'Individual', 140, 5, 17, 6],
  ['KFC', 'Biscuit', '1 biscuit', 180, 4, 22, 8],

  ['Taco Bell', 'Crunchy Taco', '1 taco', 170, 8, 13, 10],
  ['Taco Bell', 'Soft Taco', '1 taco', 180, 9, 18, 9],
  ['Taco Bell', 'Crunchwrap Supreme', '1 wrap', 530, 16, 71, 21],
  ['Taco Bell', 'Chalupa Supreme, beef', '1 chalupa', 350, 13, 30, 20],
  ['Taco Bell', 'Burrito Supreme, beef', '1 burrito', 390, 16, 51, 14],
  ['Taco Bell', 'Bean Burrito', '1 burrito', 350, 13, 54, 9],
  ['Taco Bell', 'Chicken Quesadilla', '1 quesadilla', 510, 27, 37, 27],
  ['Taco Bell', 'Cheesy Gordita Crunch', '1 item', 500, 20, 41, 28],
  ['Taco Bell', 'Nachos BellGrande', '1 order', 740, 16, 82, 38],

  ['Chipotle', 'Chicken', '4 oz', 180, 32, 0, 7],
  ['Chipotle', 'Steak', '4 oz', 150, 21, 1, 6],
  ['Chipotle', 'Carnitas', '4 oz', 210, 23, 0, 12],
  ['Chipotle', 'Barbacoa', '4 oz', 170, 24, 2, 7],
  ['Chipotle', 'Sofritas', '4 oz', 150, 8, 9, 10],
  ['Chipotle', 'White Rice', '4 oz', 210, 4, 40, 4],
  ['Chipotle', 'Brown Rice', '4 oz', 210, 4, 36, 6],
  ['Chipotle', 'Black Beans', '4 oz', 130, 8, 22, 1.5],
  ['Chipotle', 'Pinto Beans', '4 oz', 130, 8, 21, 1.5],
  ['Chipotle', 'Fajita Veggies', '2 oz', 20, 1, 5, 0],
  ['Chipotle', 'Fresh Tomato Salsa', '4 oz', 25, 0, 4, 0],
  ['Chipotle', 'Roasted Chili-Corn Salsa', '4 oz', 80, 3, 16, 1.5],
  ['Chipotle', 'Cheese', '1 oz', 110, 6, 1, 8],
  ['Chipotle', 'Sour Cream', '2 oz', 110, 2, 2, 9],
  ['Chipotle', 'Guacamole', '4 oz', 230, 2, 8, 22],
  ['Chipotle', 'Flour Tortilla (burrito)', '1 tortilla', 320, 8, 50, 9],
  ['Chipotle', 'Chips', '1 bag', 540, 7, 73, 25],
  ['Chipotle', 'Chicken Burrito Bowl', 'Rice, beans, salsa, cheese, lettuce', 660, 50, 67, 21],

  ['Subway', 'Turkey Breast', '6-inch', 280, 20, 46, 3.5],
  ['Subway', 'Turkey Breast', 'Footlong', 560, 40, 92, 7],
  ['Subway', 'Italian B.M.T.', '6-inch', 410, 20, 45, 17],
  ['Subway', 'Meatball Marinara', '6-inch', 460, 21, 55, 18],
  ['Subway', 'Sweet Onion Chicken Teriyaki', '6-inch', 330, 25, 52, 4],
  ['Subway', 'Steak & Cheese', '6-inch', 380, 26, 46, 10],
  ['Subway', 'Tuna', '6-inch', 450, 19, 44, 23],
  ['Subway', 'Veggie Delite', '6-inch', 210, 9, 39, 2],
  ['Subway', 'Chocolate Chip Cookie', '1 cookie', 210, 2, 30, 10],

  ["Domino's", 'Hand Tossed Cheese Pizza', '1 slice (medium)', 200, 8, 25, 8],
  ["Domino's", 'Hand Tossed Pepperoni Pizza', '1 slice (medium)', 230, 9, 25, 10],
  ["Domino's", 'Hand Tossed Pepperoni Pizza', '1 slice (large)', 300, 13, 35, 12],
  ["Domino's", 'Thin Crust Cheese Pizza', '1 slice (medium)', 145, 6, 11, 9],
  ["Domino's", 'Boneless Chicken', '8 pieces', 380, 27, 24, 19],
  ["Domino's", 'Garlic Bread Twists', '1 twist', 110, 3, 16, 4],

  ['Starbucks', 'Caffè Latte (2% milk)', 'Grande', 190, 13, 19, 7],
  ['Starbucks', 'Caramel Macchiato', 'Grande', 250, 10, 35, 7],
  ['Starbucks', 'Caramel Frappuccino', 'Grande', 380, 5, 55, 16],
  ['Starbucks', 'Pumpkin Spice Latte', 'Grande', 390, 14, 52, 14],
  ['Starbucks', 'Iced Brown Sugar Oatmilk Shaken Espresso', 'Grande', 120, 1, 20, 3],
  ['Starbucks', 'Cold Brew, black', 'Grande', 5, 0, 0, 0],
  ['Starbucks', 'Bacon, Gouda & Egg Sandwich', '1 sandwich', 360, 19, 34, 18],
  ['Starbucks', 'Spinach, Feta & Egg White Wrap', '1 wrap', 290, 20, 34, 8],
  ['Starbucks', 'Bacon & Gruyère Egg Bites', '2 bites', 300, 19, 9, 20],
  ['Starbucks', 'Butter Croissant', '1 croissant', 260, 5, 29, 14],
  ['Starbucks', 'Blueberry Muffin', '1 muffin', 360, 5, 52, 15],
];

function slug(...parts: string[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type Row = {
  id: string;
  name: string;
  serving: string;
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: FoodCategory;
  brand: string | null;
};

function allRows(): Row[] {
  // Ingredient and meal IDs keep the v1 format (name + serving) so existing rows match.
  const item = (category: FoodCategory) => ([name, serving, grams, calories, protein, carbs, fat]: Item): Row => ({
    id: BUILT_IN_FOOD_PREFIX + slug(name, serving),
    name,
    serving,
    grams,
    calories,
    protein,
    carbs,
    fat,
    category,
    brand: null,
  });
  return [
    ...INGREDIENTS.map(item('ingredient')),
    ...MEALS.map(item('meal')),
    ...FAST_FOOD.map(([brand, name, serving, calories, protein, carbs, fat]) => ({
      id: BUILT_IN_FOOD_PREFIX + slug(brand, name, serving),
      name,
      serving,
      grams: null,
      calories,
      protein,
      carbs,
      fat,
      category: 'fast_food' as const,
      brand,
    })),
  ];
}

const ROWS_PER_STATEMENT = 60; // 12 parameters per row

export async function seedBuiltInFoods(db: SQLiteDatabase) {
  const stored = Number(await getSetting(db, SEED_VERSION_KEY)) || 0;
  if (stored >= FOOD_SEED_VERSION) return;

  const timestamp = now();
  const rows = allRows();
  await db.withTransactionAsync(async () => {
    for (let start = 0; start < rows.length; start += ROWS_PER_STATEMENT) {
      const chunk = rows.slice(start, start + ROWS_PER_STATEMENT);
      await db.runAsync(
        `INSERT INTO foods
           (id, name, serving_label, serving_grams, calories, protein_g, carbs_g, fat_g,
            category, brand, created_at, updated_at)
         VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           category = excluded.category,
           brand = excluded.brand,
           serving_grams = excluded.serving_grams`,
        chunk.flatMap((r) => [
          r.id,
          r.name,
          r.serving,
          r.grams,
          r.calories,
          r.protein,
          r.carbs,
          r.fat,
          r.category,
          r.brand,
          timestamp,
          timestamp,
        ])
      );
    }
    await setSetting(db, SEED_VERSION_KEY, String(FOOD_SEED_VERSION));
  });
}
