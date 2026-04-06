import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { sectionTransition } from "../utils/motion";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
};

export function AnimatedSection({ children, className }: AnimatedSectionProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px", amount: 0.15 }}
      transition={sectionTransition(reduce)}
    >
      {children}
    </motion.div>
  );
}
