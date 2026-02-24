import { MessageSquare, Users, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Users, title: "Multi-operador", desc: "Gerencie múltiplas instâncias simultaneamente" },
  { icon: Zap, title: "Tempo real", desc: "Mensagens sincronizadas instantaneamente" },
  { icon: MessageSquare, title: "Histórico completo", desc: "Acesse todo o histórico de conversas" },
  { icon: Shield, title: "Seguro", desc: "Dados protegidos e criptografados" },
];

export function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background p-8">
      <div className="max-w-lg text-center space-y-8">
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Monitor</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Gerencie todas as suas conversas do WhatsApp em um só lugar.
            Selecione uma instância na barra lateral para começar.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              whileHover={{ scale: 1.03 }}
            >
              <f.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          ← Selecione um operador na barra lateral para começar
        </motion.p>
      </div>
    </div>
  );
}
