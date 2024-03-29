let socket = io("/", { transports: ["polling"] });
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
myVideo.muted = true;

let mainVideo; 
let mainUserVideoStream;
let mainType;

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


function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "Anonymous -";
}

const userFromSession = sessionStorage.getItem('userName');
console.log("userFromSession ----", userFromSession)
let user = getCookie("userName");
// if(userFromSession) {
//   user = userFromSession;
// } 
// else {
//   user = prompt("Enter your name");
//   sessionStorage.setItem('userName', user);
// }

// var peer = new Peer(undefined, {
//   path: "/peerjs",
//   host: "/",
//   port: "3030",
// });
let peer;
if(navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Version') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Version') + 8).split(' ')[0]) >= 5) {
  peer = new Peer({
    config: {
      serialization: "json"
    }
  });
} else {
  peer = new Peer();
}


let myVideoStream;
updateHelpText("ADD_PERSON")
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    triggerUserClickAction(myVideo, stream, "self");
    // addVideoStream(myVideo, stream, "self");

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        triggerUserClickAction(video, userVideoStream, "other");
        // addVideoStream(video, userVideoStream, "other");
        updateHelpText("USER_CONNECTED");
        document.getElementById("self_video").className = "self_video";  
      });
    });

    socket.on("user-connected", (userId) => {
      console.log("User connected", userId);
      updateHelpText("USER_CONNECTED");
      connectToNewUser(userId, stream);
    });
  });

const connectToNewUser = (userId, stream) => {
  try {
    const call = peer.call(userId, stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      triggerUserClickAction(video, userVideoStream, "other");
      // addVideoStream(video, userVideoStream, "other");
      document.getElementById("self_video").className = "self_video";  
    });
  } catch(err) {
    console.log("connectToNewUser", err)
  }
};

let peerId;



socket.on("room_id", (room_id) => {
  console.log("ROOM Id event TRIGGERED ------------------", peer);
  try { 
  if(peer._id) {
    console.log("ALREADY EXSTS peer id", peer._id)
    socket.emit("join-room", room_id, peer._id, user);
  } else { 
    peer.on("open", (id) => {
      console.log("NEW PEER ID", id)
      peerId = id;
      socket.emit("join-room", room_id, peerId, user);
    });
  }}
  catch(err) {
    console.log("socket.on room_id" , err);
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
  // if(type === 'other') updateHelpText("USER_CONNECTED")
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

let actionButton = document.getElementById("actionButton");

function triggerUserClickAction(video, userVideoStream, type) {
  console.log("triggerUserClickAction ----")
  mainVideo = video; 
  mainUserVideoStream = userVideoStream;
  mainType = type;
  actionButton.click();
}

actionButton.addEventListener("click", (e) => {
  console.log("addEventListener clicked ---")
  addVideoStream(mainVideo, mainUserVideoStream, mainType);
});