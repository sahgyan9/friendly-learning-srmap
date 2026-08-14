
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

const CallToAction = () => {
  const { isMentor } = useAuth();

  return (
    <section className="py-16 bg-primary/5">
      <div className="container px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-4"
          >
            Your profile is someone else's answer.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-muted-foreground mb-8 max-w-xl mx-auto"
          >
            When the next student searches for a hackathon partner, research
            collaborator, or study buddy — will they find you? It takes a few
            minutes and you're listed straight away.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {!isMentor && (
              <Button size="lg" asChild>
                <Link to="/become-mentor">Set up your mentor profile</Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link to="/posts">Explore the platform</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
