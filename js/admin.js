import { db, ref, onValue, set, remove, push } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('match-form');
    if (!form) return;

    const tableBody = document.getElementById('admin-match-list');

    const editIdInput = document.getElementById('edit-id');
    const mTitle = document.getElementById('m-title');
    const mDate = document.getElementById('m-date');
    const mTime = document.getElementById('m-time');
    const mVenue = document.getElementById('m-venue');
    const mPrice = document.getElementById('m-price');
    const mTeam1 = document.getElementById('m-team1');
    const mTeam2 = document.getElementById('m-team2');
    const mBanner = document.getElementById('m-banner');

    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');

    let isEditing = false;

    // 🔥 FETCH + SHOW DATA
    onValue(ref(db, 'matches'), (snapshot) => {
        tableBody.innerHTML = '';
        const matches = snapshot.val();

        if (!matches) {
            tableBody.innerHTML = `<tr><td colspan="6">No Matches Found</td></tr>`;
            return;
        }

        Object.keys(matches).forEach((key) => {
            const match = matches[key];

            const row = `
                <tr>
                    <td>${match.title}</td>
                    <td>${match.date}</td>
                    <td>${match.time}</td>
                    <td>${match.venue}</td>
                    <td>₹${match.price}</td>
                    <td>
                        <button onclick="editMatch('${key}')">Edit</button>
                        <button onclick="deleteMatch('${key}')">Delete</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // 🔥 Global data for edit
        window.allMatches = matches;
    });

    // 🔥 ADD / UPDATE
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = {
            title: mTitle.value,
            date: mDate.value,
            time: mTime.value,
            venue: mVenue.value,
            price: mPrice.value,
            team1: mTeam1.value,
            team2: mTeam2.value,
            banner: mBanner.value
        };

        if (isEditing) {
            set(ref(db, 'matches/' + editIdInput.value), data)
                .then(() => {
                    alert('Match Updated ✅');
                });
        } else {
            push(ref(db, 'matches'), data)
                .then(() => {
                    alert('Match Added ✅');
                });
        }

        form.reset();
        cancelEdit();
    });

    // 🔥 EDIT FUNCTION
    window.editMatch = (id) => {
        const match = window.allMatches[id];

        editIdInput.value = id;
        mTitle.value = match.title;
        mDate.value = match.date;
        mTime.value = match.time;
        mVenue.value = match.venue;
        mPrice.value = match.price;
        mTeam1.value = match.team1;
        mTeam2.value = match.team2;
        mBanner.value = match.banner;

        isEditing = true;
        formTitle.innerText = "Edit Match";
        saveBtn.innerText = "Update Match";
        cancelBtn.style.display = "inline-block";
    };

    // 🔥 DELETE FUNCTION
    window.deleteMatch = (id) => {
        if (confirm('Delete this match?')) {
            remove(ref(db, 'matches/' + id))
                .then(() => {
                    alert('Deleted ✅');
                });
        }
    };

    // 🔥 CANCEL EDIT
    const cancelEdit = () => {
        isEditing = false;
        editIdInput.value = '';
        form.reset();
        formTitle.innerText = "Add Match";
        saveBtn.innerText = "Save Match";
        cancelBtn.style.display = "none";
    };

    cancelBtn.addEventListener('click', cancelEdit);

});
