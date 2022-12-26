let socket = io("/", { transports: ["polling"] });
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const userFromSession = sessionStorage.getItem('userName');
console.log("userFromSession ----", userFromSession)
let user;
if(userFromSession) {
  user = userFromSession;
} 
else {
  user = prompt("Enter your name");
  sessionStorage.setItem('userName', user);
}

// var peer = new Peer(undefined, {
//   path: "/peerjs",
//   host: "/",
//   port: "3030",
// });
const peer = new Peer();

let myVideoStream;
updateHelpText("ADD_PERSON")
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, "self");

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, "other");
        document.getElementById("self_video").className = "self_video";  
      });
    });

    socket.on("user-connected", (userId) => {
      console.log("User connected", userId);
      connectToNewUser(userId, stream);
    });
  });

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, "other");
    document.getElementById("self_video").className = "self_video";  
  });
};

let peerId;



socket.on("room_id", (room_id) => {
  console.log("ROOM Id event TRIGGERED ------------------", peer);
  if(peer._id) {
    console.log("ALREADY EXSTS peer id", peer._id)
    socket.emit("join-room", room_id, peer._id, user);
  } else { 
    peer.on("open", (id) => {
      console.log("NEW PEER ID", id)
      peerId = id;
      socket.emit("join-room", room_id, peerId, user);
    });
  }
});

socket.on("user-disconnected", async (userName) => {
  document.getElementById("self_video").classList.remove("self_video");
  updateHelpText("USER_LEFT")
  clearUIRoomData();
  // await new Promise((resolve ) => {
  //   setTimeout(() => {
  //     resolve({});
  //   }, Math.random() * 1000);
  // });
  // window.location.reload();
});

const addVideoStream = (video, stream, type) => {
  if(type === 'other') updateHelpText("USER_CONNECTED")
  video.id = `${type}_video`
  // video.classList = `${type}_video`
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});
const skipCallButton = document.querySelector("#skipCallButton");
// const endCallButton = document.querySelector("#endCallButton");

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = `<i class="fas fa-microphone-slash"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = `<i class="fas fa-microphone"></i>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = `<i class="fas fa-video-slash"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = `<i class="fas fa-video"></i>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

// Button Actions here

skipCallButton.addEventListener("click", (e) => {
  window.location.reload();
});

function clearUIRoomData() {
  messages.innerHTML = "";
  document.getElementById("other_video")?.remove();
}

// endCallButton.addEventListener("click", (e) => {
//   socket.disconnect();
//   clearUIRoomData();
//   console.log("endCallButton")
// });

// inviteButton.addEventListener("click", (e) => {
//   prompt(
//     "Copy this link and send it to people you want to meet with",
//     window.location.href
//   );
// });

socket.on("createMessage", (message, userName) => {
  messages.innerHTML =
    messages.innerHTML +
    `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${userName === user ? "me" : userName
    }</span> </b>
        <span>${message}</span>
    </div>`;
});

function updateHelpText(key) {
  const keyMsgMap = {
    USER_LEFT: "User Left the chat. Click on add person to find a new match",
    ADD_PERSON: "Trying to find a new match. Please wait",
    USER_CONNECTED: "Someone joined the chat"
  }
  document.getElementById("help_text").innerHTML = keyMsgMap[key];
  document.getElementById("help_text_mobile").innerHTML = keyMsgMap[key];
}