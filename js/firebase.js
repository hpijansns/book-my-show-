import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6LXM57mJI-VLT3GXvimDjDaNNyNxlwro",
  authDomain: "book-my-show-b30d1.firebaseapp.com",
  databaseURL: "https://book-my-show-b30d1-default-rtdb.firebaseio.com",
  projectId: "book-my-show-b30d1",
  storageBucket: "book-my-show-b30d1.firebasestorage.app",
  messagingSenderId: "307666240968",
  appId: "1:307666240968:web:004906097839e002222cfd"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

export { db, storage, ref, onValue, set, push, update, remove, get, storageRef, uploadBytes, getDownloadURL };
