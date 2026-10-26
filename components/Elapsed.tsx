import { useEffect, useState } from 'react';

import { formatElapsed } from '@/lib/format';

// Live "12:34" since a timestamp. Render inside a <Text>.
export default function Elapsed({ since }: { since: number }) {
  const [current, setCurrent] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrent(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <>{formatElapsed(current - since)}</>;
}
