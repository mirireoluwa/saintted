import { motion, useReducedMotion } from "framer-motion";

type SectionLabelProps = {
  text: string;
  className?: string;
};

export function SectionLabel({ text, className }: SectionLabelProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const chars = Array.from(text);

  return (
    <motion.div
      className={`section-label${className ? ` ${className}` : ""}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      <span className="section-label__text" aria-label={text}>
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="section-label__char"
            variants={{
              hidden: reduceMotion ? {} : { opacity: 0, y: "0.5em" },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.4,
              ease: [0.22, 1, 0.36, 1],
              delay: reduceMotion ? 0 : i * 0.025,
            }}
          >
            {ch === " " ? " " : ch}
          </motion.span>
        ))}
      </span>
      <motion.span
        className="section-label__line"
        aria-hidden
        variants={{
          hidden: reduceMotion ? {} : { scaleX: 0 },
          visible: { scaleX: 1 },
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.7,
          ease: [0.22, 1, 0.36, 1],
          delay: reduceMotion ? 0 : 0.15,
        }}
      />
    </motion.div>
  );
}
