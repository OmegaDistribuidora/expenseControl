import { useCallback, useEffect, useRef, useState } from "react";

export const useNotice = () => {
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const dismissNotice = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setNotice(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { notice, showNotice, dismissNotice };
};
