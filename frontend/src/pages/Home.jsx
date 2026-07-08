import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { createConversation, getConversations } from "../services/api";
import "../styles/home.css";

function Home() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState("");

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const loadConversations = async () => {
    try {
      setLoadingChats(true);
      setError("");

      const data = await getConversations();

      if (data && data.length > 0) {
        setChats(data);
        setActiveChatId(data[0].id);
        return;
      }

      const newChat = await createConversation();
      setChats([newChat]);
      setActiveChatId(newChat.id);
    } catch (error) {
      console.error("Error cargando conversaciones:", error);
      setError("No se pudieron cargar las conversaciones.");
    } finally {
      setLoadingChats(false);
    }
  };

  const handleNewChat = async () => {
    try {
      setError("");

      const newChat = await createConversation();

      setChats((prevChats) => [newChat, ...prevChats]);
      setActiveChatId(newChat.id);
    } catch (error) {
      console.error("Error creando nuevo chat:", error);
      setError("No se pudo crear una nueva conversación.");
    }
  };

  const updateMessages = (newMessages, updatedTitle) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              title: updatedTitle || chat.title,
              messages: newMessages,
            }
          : chat
      )
    );
  };

  useEffect(() => {
    loadConversations();
  }, []);

  if (loadingChats) {
    return (
      <div className="home">
        <div className="chat-loading">Cargando conversaciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="chat-loading">
          <p>{error}</p>
          <button onClick={loadConversations}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!activeChat) {
    return (
      <div className="home">
        <div className="chat-loading">
          <p>No hay conversación activa.</p>
          <button onClick={handleNewChat}>Crear conversación</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
      />

      <ChatWindow
        conversationId={activeChatId}
        messages={activeChat.messages || []}
        setMessages={updateMessages}
      />
    </div>
  );
}

export default Home;