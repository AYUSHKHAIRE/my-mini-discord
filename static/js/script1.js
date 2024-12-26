let CurrentDeskID = NaN;
let socketsdict = {};
let connecteddesks = new Set();
let originalOrder = [];
let isReplyingToAnotherMessage = false;

function saveOriginalOrder() {
  const mainlist = document.querySelector(".chat-list");
  if (mainlist) {
    originalOrder = Array.from(mainlist.children);
  } else {
    console.warn("Chat list not found.");
  }
}

function restoreOriginalOrder() {
  const mainlist = document.querySelector(".chat-list");
  if (mainlist && originalOrder.length > 0) {
    mainlist.innerHTML = "";
    originalOrder.forEach((element) => {
      mainlist.appendChild(element);
    });
  } else {
    console.warn("Unable to restore original order.");
  }
}

function ensureTypingIndicatorExists() {
  let existingIndicator = document.querySelector(".typing-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }
  const incicatorposition = document.querySelector(
    ".typing-indicator-position"
  );
  const typingIndicator = document.createElement("div");
  typingIndicator.classList.add("message", "received", "typing-indicator");
  const typingMessageContent = document.createElement("p");
  typingMessageContent.textContent = "Typing .....";
  typingIndicator.appendChild(typingMessageContent);
  incicatorposition.appendChild(typingIndicator);
  return typingIndicator;
}

function subMitOnEner() {
  messageInput = document.querySelector("#messageInput");
  sendButton = document.querySelector("#sendButton");
  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendButton.click();
      messageInput.textContent = "";
    }
  });
}

function scrollToTheMentionedMessage(messageeid) {
  const messageElement = document.querySelector(`#${messageeid}`);
  if (messageElement) {
    messageElement.scrollIntoView({
      behavior: "smooth", 
      block: "center", 
    });
    console.log(messageElement.parentElement.parentElement.parentElement)
    messageElement.parentElement.parentElement.classList.add(
      "highlight"
    );
    setTimeout(() => {
      messageElement.parentElement.parentElement.classList.remove("highlight");
    }, 2000);
    console.log(`Scrolled to message with ID: ${messageeid}`);
  } else {
    console.warn(`Message with ID '${messageeid}' not found.`);
  }
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
  console.log("Chat container scrolled to the bottom");
}

function fetchAvailableDesks() {
  fetch("/chat/available_desks")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((chatData) => {
      const chatList = document.querySelector(".chat-list");
      chatData.data.forEach((desk) => {
        const chatItem = document.createElement("li");
        chatItem.classList.add("chat-item");
        chatItem.classList.add(`chat-item-${desk.id}`);
        chatItem.addEventListener("click", () =>
          loadChat(desk.id, desk.sender)
        );
        const profileImg = document.createElement("img");
        profileImg.src = desk.profile || "https://via.placeholder.com/40"; // Use placeholder if profile is unavailable
        profileImg.alt = "Profile";
        profileImg.classList.add("profile-pic");
        const chatInfo = document.createElement("div");
        chatInfo.classList.add("chat-info");
        chatInfo.classList.add(`chat-${desk.id}`);
        const name = document.createElement("p");
        name.classList.add("name");
        if (Array.isArray(desk.participants)) {
          name.textContent = desk.participants.join(", ");
        } else if (typeof desk.participants === "string") {
          name.textContent = desk.participants;
        } else {
          name.textContent = "Unknown Participants";
        }
        const preview = document.createElement("p");
        const unread = document.createElement("p");
        preview.classList.add(`preview-${desk.id}`);
        unread.classList.add("unread");
        unread.classList.add(`unread-${desk.id}`);
        if (desk.new_messages > 0) {
          preview.textContent = `${desk.latest_message}`;
          unread.textContent = `${desk.new_messages}`;
        } else {
          preview.textContent = `${desk.latest_message}`;
          unread.style.display = "None";
        }
        const uppearcontainer = document.createElement("div");
        const lowercontainer = document.createElement("div");
        uppearcontainer.appendChild(name);
        lowercontainer.appendChild(preview);
        lowercontainer.classList.add("lowercontainer");
        lowercontainer.appendChild(unread);
        chatInfo.appendChild(uppearcontainer);
        chatInfo.appendChild(lowercontainer);
        chatItem.appendChild(profileImg);
        chatItem.appendChild(chatInfo);
        chatList.appendChild(chatItem);
        estabilish_socket(desk.id);
        connecteddesks.add(desk.id);
      });
    })
    .catch((error) => {
      console.error("Error fetching chat data:", error);
    });
}

function moveDeskToTheTop(deskid) {
  let mainlist = document.querySelector(".chat-list"); // Parent container
  const containerToMove = document.querySelector(`.chat-item-${deskid}`); // Target container
  if (mainlist && containerToMove) {
    mainlist.prepend(containerToMove);
    console.log(`Moved desk ${deskid} to the top`);
  } else {
    console.warn("Main list or container to move not found:", deskid);
  }
}

function estabilish_socket(deskid) {
  const chatSocket = new WebSocket(
    "ws://" + window.location.host + "/ws/" + deskid + "/"
  );
  setTimeout(() => {
    chatSocket.send(`connected desk ${deskid}`);
  }, 1000);
  socketsdict[deskid] = chatSocket;
  applyReceivingMessageToAllSockets();
}

function send_message_to_socket(deskid, type, message, message_id, username,reply_to) {
  const socket = socketsdict[deskid];
  data = {
    type: type,
    message: message,
    sender: username,
    deskid: deskid,
    message_id: message_id,
    reply_to : reply_to
  };
  socket.send(
    JSON.stringify({
      data: data,
    })
  );
}

function markAsRead(message_id, deskid) {
  let myname = document.querySelector("#cliusername").textContent;
  myname = myname.replace(/\s+/g, "");
  send_message_to_socket(
    (deskid = deskid),
    (type = "mark_as_read"),
    (message = NaN),
    (message_id = message_id),
    (username = myname)
  );
  console.log("sent mark as read to the socket");
}

function sendAMessage() {
  const sendButton = document.getElementById("sendButton");
  const messageInput = document.getElementById("messageInput");
  sendButton.addEventListener("click", function () {
    const messageContent = messageInput.value.trim();
    if (!messageContent) {
      alert("Message cannot be empty!");
      return;
    }
    const csrfToken = getCookie("csrftoken");
    desk_id = CurrentDeskID;
    username = document.querySelector("#cliusername").textContent;
    console.log(isReplyingToAnotherMessage)
    if (isReplyingToAnotherMessage == false) {
      console.log("no reply");
      send_message_to_socket(
        (deskid = desk_id),
        (type = "chat_message"),
        (message = messageInput.value),
        (message_id = NaN),
        (username = username),
        (reply_to = NaN)
      );
    } else {
      console.log("exists reply:", isReplyingToAnotherMessage);
      send_message_to_socket(
        (deskid = desk_id),
        (type = "chat_message"),
        (message = messageInput.value),
        (message_id = NaN),
        (username = username),
        (reply_to = isReplyingToAnotherMessage)
      );
      isReplyingToAnotherMessage = false;
      console.log("sending reply to another message");
      const replycontainer = document.querySelector(".replyposition");
      replycontainer.style.display = "none";
    }

    messageInput.value = ""; 
  });
}

function createANewwChat() {
  const createChatButton = document.getElementById("newChatButton");
  if (!createChatButton) {
    console.error("Create Chat Button not found!");
    return;
  }
  const chatInput = document.getElementById("newchatinput");
  createChatButton.addEventListener("click", function () {
    let username = chatInput.value.trim();
    if (!username) {
      alert("Username cannot be empty!");
      return;
    }
    const csrfToken = getCookie("csrftoken");
    console.log(csrfToken);
    fetch(`/chat/c/new/${username}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({ username: username }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to create a new chat");
        }
        return response.json();
      })
      .then((data) => {
        const chatsList = document.querySelector(".chat-list");
        const newDeskDiv = document.createElement("li");
        newDeskDiv.classList.add("chat-item");
        const profileImg = document.createElement("img");
        profileImg.classList.add("profile-pic");
        profileImg.src = "https://via.placeholder.com/40";
        const chatInfo = document.createElement("div");
        chatInfo.classList.add("chat-info");
        let name = document.createElement("p");
        name.classList.add("name");
        const preview = document.createElement("p");
        preview.classList.add(`preview-${data.deskid}`);
        preview.textContent = "No new messages";
        name.textContent = username;
        chatInfo.append(name);
        chatInfo.append(preview);
        newDeskDiv.append(profileImg);
        newDeskDiv.append(chatInfo);
        chatsList.append(newDeskDiv);
        chatInput.value = ""; // Clear the input field
        estabilish_socket(data.deskid);
        loadChat(data.deskid);
        connecteddesks.add(data.deskid);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
}

function createeTypeIndicator() {
  let typingIndicator = ensureTypingIndicatorExists();
  typingIndicator.style.display = "none";
}

function broadcast_message(deskid) {
  console.log("Applying broadcasting message");
  const socket = socketsdict[deskid];
  socket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    const chatMessages = document.querySelector(".chat-messages");
    let myname = document.querySelector("#cliusername").textContent;
    myname = myname.replace(/\s+/g, "");
    // Handling chat messages in same group
    if (
      deskid === CurrentDeskID &&
      myname !== data.data.username &&
      data.data.type == "chat_message"
    ) {
      console.log("Added received chat message to the desk");
      const timestampContent = document.createElement("p");
      let content = `${data.data.username} at ${data.data.timestamp}`;
      timestampContent.textContent = content;
      const replyImg = document.createElement("img");
      replyImg.src = "/static/images/Reply-all-Email-512.webp";
      replyImg.id = `reply-to-${data.data.message_id}`;
      replyImg.classList.add("replydiv");
      replyImg.addEventListener("click", () => {
        displayreply(data.data.message_id);
      });
      const replyParent = document.createElement("div");
      replyParent.classList.add("replyparent");
      replyParent.appendChild(replyImg);
      timestampContent.classList.add("received");
      const messageContent = document.createElement("h2");
      messageContent.textContent = data.data.message;
      const messageDiv = document.createElement("div");
      const mainMessageDiv = document.createElement("div");
      messageDiv.id = `${data.data.message_id}`;
      messageDiv.classList.add("lineargrad");
      const mainMainMessageDiv = document.createElement("div");
      if (data.data.reply_to != null) {
        const linkercontainer = document.createElement("h4");
        linkercontainer.textContent = document.querySelector(
          `#${data.data.reply_to}`
        ).textContent;
        linkercontainer.classList.add("tomsgptr");
        linkercontainer.addEventListener("click", () => {
          scrollToTheMentionedMessage(data.data.reply_to);
        });
        mainMessageDiv.appendChild(linkercontainer);
      }
      messageDiv.appendChild(messageContent);
      mainMainMessageDiv.classList.add("mainmsg");
      mainMessageDiv.appendChild(messageDiv);
      mainMainMessageDiv.appendChild(mainMessageDiv);
      mainMainMessageDiv.appendChild(replyParent);
      mainMessageDiv.classList.add("msgparent");
      const mainMainMainMessageDiv = document.createElement("div");
      mainMainMainMessageDiv.classList.add("received");
      mainMainMainMessageDiv.appendChild(mainMainMessageDiv);
      const chatMessages = document.querySelector(".chat-messages");
      chatMessages.appendChild(mainMainMainMessageDiv);
      chatMessages.appendChild(timestampContent);
      scrollToBottom(chatMessages);
      moveDeskToTheTop(deskid);
      markAsRead(data.data.message_id,deskid);
    }
    // Handling typing indicator in samee group
    if (
      deskid === CurrentDeskID &&
      myname !== data.data.sender &&
      data.data.type == "typing"
    ) {
      console.log("typing messsagge to the same desk");
      const typingIndicator = ensureTypingIndicatorExists();
      typingIndicator.style.display = "block";
      scrollToBottom(chatMessages);
      clearTimeout(typingIndicator.timeoutId);
      saveOriginalOrder();
      moveDeskToTheTop(deskid);
      typingIndicator.timeoutId = setTimeout(() => {
        typingIndicator.style.display = "none";
        restoreOriginalOrder();
      }, 1000);
    }
    // Handling typing in another group
    if (
      deskid !== CurrentDeskID &&
      myname !== data.data.sender &&
      data.data.type == "typing"
    ) {
      let targeted_group = document.querySelector(`.preview-${deskid}`);
      if (targeted_group) {
        if (!targeted_group.dataset.oldContent) {
          targeted_group.dataset.oldContent = targeted_group.textContent;
        }
        targeted_group.textContent = `${data.data.sender} is typing ...`;
        saveOriginalOrder();
        moveDeskToTheTop(deskid);
        if (targeted_group.timeoutId) {
          clearTimeout(targeted_group.timeoutId);
        }
        targeted_group.timeoutId = setTimeout(() => {
          if (
            targeted_group.textContent === `${data.data.sender} is typing ...`
          ) {
            targeted_group.textContent =
              targeted_group.dataset.oldContent || "";
            console.log("Resetting preview to old content after typing");
          }
          targeted_group.timeoutId = null;
          delete targeted_group.dataset.oldContent;
          restoreOriginalOrder();
        }, 1000);
      } else {
        console.warn("Targeted group not found for typing event:", deskid);
      }
    }
    // chat message in another group
    if (
      deskid !== CurrentDeskID &&
      myname !== data.data.username &&
      data.data.type == "chat_message"
    ) {
      console.log("New message to another desk:", data.data);
      let previewcontainer = document.querySelector(
        `.preview-${data.data.deskid}`
      );
      let unreadcontainer = document.querySelector(
        `.unread-${data.data.deskid}`
      );
      if (previewcontainer && unreadcontainer) {
        if (
          previewcontainer.textContent !==
          `${data.data.username} : ${data.data.message}`
        ) {
          previewcontainer.textContent = `${data.data.username} : ${data.data.message}`;
        } else {
        }
        let oldContent = parseInt(unreadcontainer.textContent) || 0;
        unreadcontainer.textContent = `${oldContent + 1}`;
        unreadcontainer.style.display = "flex";
      } else {
        console.warn(
          "Preview or unread container not found for desk:",
          data.data.deskid
        );
      }
    }
    // message sent by me in same group ( need to assign id by servver )
    if (
      deskid === CurrentDeskID &&
      myname == data.data.username &&
      data.data.type == "chat_message"
    ) {
      const timestampContent = document.createElement("p");
      let myname = document.querySelector("#cliusername").textContent;
      myname = myname.replace(/\s+/g, "");
      let content = `You at ${data.data.timestamp}`;
      timestampContent.textContent = content;
      const replyImg = document.createElement("img");
      replyImg.src = "/static/images/Reply-all-Email-512.webp";
      replyImg.id = `reply-to-${data.data.message_id}`;
      replyImg.classList.add("replydiv");
      replyImg.addEventListener("click", () => {
        displayreply(data.data.message_id);
      });
      const replyParent = document.createElement("div");
      replyParent.classList.add("replyparent");
      replyParent.appendChild(replyImg);
      timestampContent.classList.add("sent");
      const messageContent = document.createElement("h2");
      messageContent.textContent = data.data.message;
      const messageDiv = document.createElement("div");
      const mainMessageDiv = document.createElement("div");
      messageDiv.id = `${data.data.message_id}`;
      messageDiv.classList.add("lineargrad");
      const mainMainMessageDiv = document.createElement("div");
      if (data.data.reply_to != null) {
        console.log("reply to message is detected");
        const linkercontainer = document.createElement("h4");
        linkercontainer.textContent = document.querySelector(
          `#${data.data.reply_to}`
        ).textContent;
        linkercontainer.classList.add("tomsgptr");
        linkercontainer.addEventListener("click", () => {
          scrollToTheMentionedMessage(data.data.reply_to);
        });
        mainMessageDiv.appendChild(linkercontainer);
      }
      messageDiv.appendChild(messageContent);
      mainMainMessageDiv.classList.add("mainmsg");
      mainMessageDiv.appendChild(messageDiv);
      mainMainMessageDiv.appendChild(mainMessageDiv);
      mainMainMessageDiv.appendChild(replyParent);
      mainMessageDiv.classList.add("msgparent");
      const mainMainMainMessageDiv = document.createElement("div");
      mainMainMainMessageDiv.classList.add(
        message.sender == message.receiver ? "sent" : "received"
      );
      mainMainMainMessageDiv.appendChild(mainMainMessageDiv);
      chatMessages.appendChild(mainMainMainMessageDiv);
      chatMessages.appendChild(timestampContent);
      scrollToBottom(chatMessages);
      moveDeskToTheTop(deskid);
      markAsRead(data.data.message_id,deskid);
    }
  };

  socket.onclose = function () {
    console.warn(`WebSocket for desk ${deskid} closed.`);
  };

  socket.onerror = function (error) {
    console.error(`Error in WebSocket for desk ${deskid}:`, error);
  };
}

function applyReceivingMessageToAllSockets() {
  console.log("applying messagges to all sockets");
  for (const deskid in socketsdict) {
    if (socketsdict.hasOwnProperty(deskid)) {
      console.log("entered in broaadcast condition");
      broadcast_message(deskid);
    }
  }
  console.log("applying messagges to all sockets completed");
}

function trackTypingEvent() {
  const messageInput = document.getElementById("messageInput");
  if (!messageInput) return;
  username = document.querySelector("#cliusername").textContent;
  let typingTimeout;
  messageInput.addEventListener("input", () => {
    clearTimeout(typingTimeout);
    let myname = document.querySelector("#cliusername").textContent;
    myname = myname.replace(/\s+/g, "");
    send_message_to_socket(CurrentDeskID, "typing", null, null, myname);
    typingTimeout = setTimeout(() => {
      console.log("Typing event finished.");
    }, 1000);
  });
}

function displayreply(reply_id) {
  const message_id = reply_id.replace("reply-to-", ""); 
  const messageElement = document.querySelector(`#${message_id}`); 
  if (messageElement) {
    const messageContent = messageElement.textContent; 
    const replycontainer = document.querySelector(".replyposition");
    replycontainer.textContent = messageContent;
    if (replycontainer.style.display == "none") {
      replycontainer.style.display = "flex";
    }
    isReplyingToAnotherMessage = message_id;
    console.log("displayed message with id ", isReplyingToAnotherMessage);
  } else {
    console.warn(`Element with ID '${message_id}' not found.`);
  }
}

function loadChat(chat_id, sender) {
  fetch(`/chat/c/${chat_id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((chatData) => {
      const chatMessages = document.querySelector(".chat-messages");
      chatMessages.innerHTML = "";
      lastday = "";
      chatData.data.forEach((message) => {
        const timestampContent = document.createElement("p");
        if (chatData.members > 2) {
          let myname = document.querySelector("#cliusername").textContent;
          myname = myname.replace(/\s+/g, "");
          if (myname != message.sender) {
            let content = `${message.sender} at ${message.time}`;
            console.log(myname);
            timestampContent.textContent = content;
          } else {
            let content = `You at ${message.time}`;
            timestampContent.textContent = content;
          }
        } else {
          let content = `${message.time}`;
          timestampContent.textContent = content;
        }
        const replyImg = document.createElement("img");
        replyImg.src = "/static/images/Reply-all-Email-512.webp";
        replyImg.id = `reply-to-${message.message_id}`;
        replyImg.classList.add("replydiv");
        replyImg.addEventListener("click", () => {
          displayreply(message.message_id);
        });
        const replyParent = document.createElement("div");
        replyParent.classList.add("replyparent");
        replyParent.appendChild(replyImg);
        timestampContent.classList.add(
          message.sender == message.receiver ? "sent" : "received"
        );
        const messageContent = document.createElement("h2");
        messageContent.textContent = message.content;
        const messageDiv = document.createElement("div");
        const mainMessageDiv = document.createElement("div");
        messageDiv.id = `${message.message_id}`;
        messageDiv.classList.add("lineargrad");
        const mainMainMessageDiv = document.createElement("div");
        if (message.reply_to != null) {
          console.log("reply to message is detected")
          const linkercontainer = document.createElement('h4');
          linkercontainer.textContent = message.reply_to_message_content;
          linkercontainer.classList.add("tomsgptr");
          linkercontainer.addEventListener("click", () => {
            scrollToTheMentionedMessage(message.reply_to);
          })
          mainMessageDiv.appendChild(linkercontainer);
        }
        messageDiv.appendChild(messageContent);
        mainMainMessageDiv.classList.add("mainmsg");
        mainMessageDiv.appendChild(messageDiv);
        mainMainMessageDiv.appendChild(mainMessageDiv)
        mainMainMessageDiv.appendChild(replyParent);
        mainMessageDiv.classList.add("msgparent")
        const mainMainMainMessageDiv = document.createElement("div");
        mainMainMainMessageDiv.classList.add(
          message.sender == message.receiver ? "sent" : "received",
        );
        mainMainMainMessageDiv.appendChild(mainMainMessageDiv);
        chatMessages.appendChild(mainMainMainMessageDiv);
        chatMessages.appendChild(timestampContent);
        if (message.day != lastday) {
          const dayContent = document.createElement("p");
          const hrContent = document.createElement("hr");
          dayContent.textContent = message.day;
          dayContent.style.textAlign = "center";
          hrContent.style.width = "100%";
          hrContent.style.color = "#797979";
          chatMessages.appendChild(dayContent);
          chatMessages.appendChild(hrContent);
          lastday = message.day;
        }
        if (message.read_by_user == false) {
          console.log("marking as read");
          markAsRead((message_id = message.message_id), (deskid = chat_id));
        }
      });
      const chatName = document.querySelector(".chat-name");
      const profilePic = document.querySelector(".chat-header .profile-pic");
      chatName.textContent = chatData.sender || "Unknown";
      profilePic.src = chatData.profile || "https://via.placeholder.com/40";
      CurrentDeskID = chat_id;
      const chatmain = document.querySelector(".chat-area");
      chatmain.style.display = "flex";
      scrollToBottom(chatMessages);
      const newPreviewcon = document.querySelector(`.preview-${chat_id}`);
      newPreviewcon.textContent = "No new messages";
      const newUnreadcon = document.querySelector(`.unread-${chat_id}`);
      newUnreadcon.style.display = "none";
      console.log("chhat loaded . so displayeed none");
    })
    .catch((error) => {
      console.error("Error loading chat data:", error);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  // Fetch the available desks
  fetchAvailableDesks();

  // sending a message
  sendAMessage();

  // creating a new chat
  createANewwChat();

  // track typing event
  trackTypingEvent();

  // submit on enter
  subMitOnEner();
});
