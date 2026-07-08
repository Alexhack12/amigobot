import { motion } from "framer-motion";
import "../styles/messagebubble.css";

function MessageBubble({ sender, text }) {
  return (
    <motion.div
      className={`message ${sender}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p>{text}</p>
    </motion.div>
  );
}

export default MessageBubble;