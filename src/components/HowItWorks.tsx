import { motion } from "framer-motion";
import { UserPlus, Coins, Gamepad2, Gift } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create Account",
    desc: "Sign up in seconds and get 10,000 free Fun Coins instantly.",
  },
  {
    icon: Coins,
    title: "Collect Coins",
    desc: "Earn daily bonuses, complete challenges, or purchase coin packages.",
  },
  {
    icon: Gamepad2,
    title: "Play Games",
    desc: "Choose from slots, plinko, mines, and more premium titles.",
  },
  {
    icon: Gift,
    title: "Redeem Prizes",
    desc: "Convert Sweeps Coins into real prizes through our secure redemption.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How It <span className="gold-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg">Four simple steps to start winning</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="relative mx-auto w-16 h-16 mb-6">
                <div className="absolute inset-0 gold-gradient rounded-2xl rotate-6 opacity-20" />
                <div className="relative glass-card gold-border-glow rounded-2xl w-full h-full flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 gold-gradient rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
