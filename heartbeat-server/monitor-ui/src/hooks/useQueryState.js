import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryState(key, fallback = "") {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => searchParams.get(key) || fallback, [fallback, key, searchParams]);

  const setValue = (nextValue) => {
    const nextParams = new URLSearchParams(searchParams);

    if (!nextValue || nextValue === fallback) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValue);
    }

    setSearchParams(nextParams, { replace: true });
  };

  return [value, setValue];
}
