/***********************
 * GLOBAL STATE
 ***********************/
let db;
let songs = [];
let currentSong = 0;

/***********************
 * DOM ELEMENTS
 ***********************/
const song = document.getElementById("song");
const playpause = document.getElementById("play-pause");
const actionIcon = document.getElementById("action");
const progress = document.getElementById("progress");

const title = document.getElementById("title");
const artist = document.getElementById("artist");
const songImg = document.getElementById("song-img");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const playlist = document.getElementById("playlist");
const addSongBtn = document.getElementById("addSongBtn");
const addSongInput = document.getElementById("addSongInput");

/***********************
 * DEFAULT SONGS (STATIC FILES)
 ***********************/
const defaultSongs = [
  {
    title: "Supernova",
    artist: "AESPA",
    src: "assets/audio/aespa - Supernova (1).mp3",
    img: "assets/images/default.jpeg"
  },
  {
    title: "Hot Mess",
    artist: "AESPA",
    src: "assets/audio/aespa - Hot Mess.mp3",
    img: "assets/images/default.jpeg"
  }
];

/***********************
 * INDEXED DB SETUP
 ***********************/
const request = indexedDB.open("MusicPlayerDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("songs")) {
    db.createObjectStore("songs", {
      keyPath: "id",
      autoIncrement: true
    });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  seedDefaultSongsIfEmpty();
};

request.onerror = () => {
  console.error("IndexedDB failed to open");
};

/***********************
 * SEED DEFAULT SONGS (ONLY ONCE)
 ***********************/
function seedDefaultSongsIfEmpty() {
  const tx = db.transaction("songs", "readonly");
  const store = tx.objectStore("songs");
  const countReq = store.count();

  countReq.onsuccess = async () => {
    if (countReq.result === 0) {
      const writeTx = db.transaction("songs", "readwrite");
      const writeStore = writeTx.objectStore("songs");

      for (const s of defaultSongs) {
        const response = await fetch(s.src);
        const blob = await response.blob();

        writeStore.add({
          title: s.title,
          artist: s.artist,
          audio: blob,
          img: s.img
        });
      }

      writeTx.oncomplete = () => {
        loadSongsFromDB();
      };
    } else {
      loadSongsFromDB();
    }
  };
}

/***********************
 * LOAD SONGS FROM DB
 ***********************/
function loadSongsFromDB() {
  songs = [];

  const tx = db.transaction("songs", "readonly");
  const store = tx.objectStore("songs");
  const cursorReq = store.openCursor();

  cursorReq.onsuccess = (e) => {
    const cursor = e.target.result;

    if (cursor) {
      const data = cursor.value;

      songs.push({
        title: data.title,
        artist: data.artist,
        img: data.img,
        src: URL.createObjectURL(data.audio)
      });

      cursor.continue();
    } else {
      if (songs.length > 0) {
        currentSong = 0;
        loadSong(currentSong);
        createPlaylist();
      }
    }
  };
}

/***********************
 * LOAD SINGLE SONG
 ***********************/
function loadSong(index) {
  const s = songs[index];
  if (!s) return;

  title.innerText = s.title;
  artist.innerText = s.artist;
  songImg.src = s.img;
 
  songImg.onerror = () => {
    songImg.src = "assets/images/default.jpeg";
  };

  song.src = s.src;
  song.load();

  highlightActiveSong();
}

/***********************
 * PLAYLIST UI
 ***********************/
function createPlaylist() {
  playlist.innerHTML = "";

  songs.forEach((s, index) => {
    const li = document.createElement("li");
    li.textContent = `${s.title} - ${s.artist}`;

    li.addEventListener("click", () => {
      currentSong = index;
      loadSong(currentSong);
      song.play();
      actionIcon.classList.replace("fa-play", "fa-pause");
    });

    playlist.appendChild(li);
  });
}

function highlightActiveSong() {
  const items = playlist.querySelectorAll("li");
  items.forEach((item, index) => {
    item.classList.toggle("active", index === currentSong);
  });
}

/***********************
 * PLAY / PAUSE
 ***********************/
playpause.addEventListener("click", () => {
  if (song.paused) {
    song.play();
    actionIcon.classList.replace("fa-play", "fa-pause");
    songImg.classList.add("rotating");
  } else {
    song.pause();
    actionIcon.classList.replace("fa-pause", "fa-play");
    songImg.classList.remove("rotating");
  }
});

/***********************
 * PROGRESS BAR
 ***********************/
song.addEventListener("timeupdate", () => {
  if (!isNaN(song.duration)) {
    progress.value = (song.currentTime / song.duration) * 100;
  }
});

progress.addEventListener("input", () => {
  song.currentTime = (progress.value / 100) * song.duration;
});

/***********************
 * NEXT / PREVIOUS
 ***********************/
nextBtn.addEventListener("click", () => {
  if (!songs.length) return;
  currentSong = (currentSong + 1) % songs.length;
  loadSong(currentSong);
  song.play();
  actionIcon.classList.replace("fa-play", "fa-pause");
  songImg.classList.add("rotating");

});

prevBtn.addEventListener("click", () => {
  if (!songs.length) return;
  currentSong = (currentSong - 1 + songs.length) % songs.length;
  loadSong(currentSong);
  song.play();
  actionIcon.classList.replace("fa-play", "fa-pause");
  songImg.classList.add("rotating");
});


song.addEventListener("ended", () => {
  nextBtn.click();
});


addSongBtn.addEventListener("click", () => {
  addSongInput.click();
});
song.addEventListener("ended", () => {
  songImg.classList.remove("rotating");
  nextBtn.click();
});


addSongInput.addEventListener("change", () => {
  const files = Array.from(addSongInput.files);
  if (!files.length) return;

  const tx = db.transaction("songs", "readwrite");
  const store = tx.objectStore("songs");

  files.forEach(file => {
    store.add({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local File",
      audio: file,
      img: "assets/images/default.jpg"
    });
  });

  tx.oncomplete = () => {
    loadSongsFromDB();
  };

  addSongInput.value = "";
});
