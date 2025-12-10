import "./css/style.css";

class ChatApp {
  constructor() {
    this.currentUser = null;
    this.ws = null;
    // Используем переменные окружения, если они определены через DefinePlugin
    const apiUrl = typeof process !== "undefined" && process.env?.API_URL 
      ? process.env.API_URL 
      : "http://localhost:3000";
    let wsUrl = typeof process !== "undefined" && process.env?.WS_URL 
      ? process.env.WS_URL 
      : "ws://localhost:3000";
    
    // Преобразуем http/https в ws/wss, если URL начинается с http
    if (wsUrl.startsWith("http")) {
      wsUrl = wsUrl.replace(/^http/, "ws");
    }
    
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;

    this.init();
  }

  init() {
    this.bindEvents();
    this.showNicknameModal();
  }

  bindEvents() {
    // Форма никнейма
    const nicknameForm = document.getElementById("nicknameForm");
    nicknameForm.addEventListener("submit", (e) => this.handleNicknameSubmit(e));

    // Отправка сообщения
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    sendBtn.addEventListener("click", () => this.sendMessage());
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendMessage();
      }
    });

    // Выход из чата
    const exitBtn = document.getElementById("exitBtn");
    exitBtn.addEventListener("click", () => this.exitChat());

    // Обработка закрытия окна/вкладки
    window.addEventListener("beforeunload", () => {
      if (this.ws && this.currentUser) {
        this.sendExitMessage();
      }
    });
  }

  async handleNicknameSubmit(e) {
    e.preventDefault();
    const nicknameInput = document.getElementById("nicknameInput");
    const errorMessage = document.getElementById("errorMessage");
    const submitBtn = document.getElementById("submitBtn");
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
      errorMessage.textContent = "Пожалуйста, введите никнейм";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Проверка...";
    errorMessage.textContent = "";

    try {
      const response = await fetch(`${this.apiUrl}/new-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nickname }),
      });

      const data = await response.json();

      if (response.ok && data.status === "ok") {
        this.currentUser = data.user;
        this.hideNicknameModal();
        this.showChat();
        this.connectWebSocket();
      } else {
        errorMessage.textContent =
          data.message || "Этот никнейм уже занят. Выберите другой.";
        nicknameInput.focus();
        nicknameInput.select();
      }
    } catch (error) {
      errorMessage.textContent = "Ошибка подключения к серверу. Попробуйте позже.";
      console.error("Error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Войти";
    }
  }

  showNicknameModal() {
    const modal = document.getElementById("nicknameModal");
    const chatContainer = document.getElementById("chatContainer");
    modal.classList.remove("hidden");
    chatContainer.classList.add("hidden");
  }

  hideNicknameModal() {
    const modal = document.getElementById("nicknameModal");
    modal.classList.add("hidden");
  }

  showChat() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.classList.remove("hidden");
    document.getElementById("messageInput").focus();
  }

  connectWebSocket() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Если это массив - это список пользователей
        if (Array.isArray(data)) {
          this.updateUsersList(data);
        } else if (data.type === "send") {
          // Если это сообщение
          this.displayMessage(data);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      // При переподключении можно добавить логику
    };
  }

  sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    if (!message || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageData = {
      type: "send",
      message: message,
      user: this.currentUser,
    };

    this.ws.send(JSON.stringify(messageData));
    messageInput.value = "";
  }

  displayMessage(data) {
    const messagesContainer = document.getElementById("messagesContainer");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    const isOwnMessage = data.user.id === this.currentUser.id;
    messageDiv.classList.add(isOwnMessage ? "own" : "other");

    const messageHeader = document.createElement("div");
    messageHeader.className = "message-header";

    if (isOwnMessage) {
      const youSpan = document.createElement("span");
      youSpan.className = "message-you";
      youSpan.textContent = "You";
      messageHeader.appendChild(youSpan);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = data.user.name;
      messageHeader.appendChild(nameSpan);
    }

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = data.message;

    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageText);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  updateUsersList(users) {
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";

    users.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = user.name;
      if (user.id === this.currentUser.id) {
        li.textContent += " (You)";
        li.style.fontWeight = "600";
      }
      usersList.appendChild(li);
    });
  }

  sendExitMessage() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
      const exitData = {
        type: "exit",
        user: this.currentUser,
      };
      this.ws.send(JSON.stringify(exitData));
    }
  }

  exitChat() {
    this.sendExitMessage();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentUser = null;
    this.hideChat();
    this.showNicknameModal();
    this.clearMessages();
    this.clearUsersList();
  }

  hideChat() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.classList.add("hidden");
  }

  clearMessages() {
    const messagesContainer = document.getElementById("messagesContainer");
    messagesContainer.innerHTML = "";
  }

  clearUsersList() {
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";
  }
}

// Инициализация приложения при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  new ChatApp();
});

