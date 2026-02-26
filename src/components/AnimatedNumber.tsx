import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export const AnimatedNumber = ({ value, format = (v: number) => Math.round(v).toLocaleString() }: { value: number; format?: (v: number) => string }) => {
  const animatedValue = useSpring(value, { stiffness: 50, damping: 15 });
  const [displayValue, setDisplayValue] = useState(format(value));

  useEffect(() => {
    animatedValue.set(value);
  }, [animatedValue, value]);

  useEffect(() => {
    return animatedValue.on("change", (latest) => {
      setDisplayValue(format(latest));
    });
  }, [animatedValue, format]);

  return <motion.span>{displayValue}</motion.span>;
};
