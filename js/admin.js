import { db, storage, ref, onValue, set, remove, push, storageRef, uploadBytes, getDownloadURL } from './firebase.js';

if (document.getElementById('match-form')) {
    const form = document.getElementById('match-form');
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
    let currentMatchData = null;

    onValue(ref(db, 'matches'), (snapshot) => {
        tableBody.innerHTML = '';
        const matches =[];
        snapshot.forEach(child => matches.push({ id: child.key, ...child.val() }));
        matches.sort((a,b) => b.timestamp - a.timestamp);
        
        matches.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.title}</strong></td>
                <td>${m.date} ${m.time}</td>
                <td>₹${m.price}</td>
                <td>
                    <button class="action-btn btn-edit" data-id="${m.id}">Edit</button>
                    <button class="action-btn btn-delete" data-id="${m.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
            tr.querySelector('.btn-edit').dataset.raw = JSON.stringify(m);
        });

        document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => loadEdit(JSON.parse(e.target.dataset.raw))));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => deleteMatch(e.target.dataset.id)));
    });

    const loadEdit = (data) => {
        isEditing = true;
        currentMatchData = data;
        formTitle.innerText = "Edit Match";
        cancelBtn.style.display = 'inline-block';
        saveBtn.innerText = "Update Match";

        editIdInput.value = data.id;
        mTitle.value = data.title;
        mDate.value = data.date;
        mTime.value = data.time;
        mVenue.value = data.venue;
        mPrice.value = data.price;
        mTeam1.value = ""; mTeam2.value = ""; mBanner.value = "";
        window.scrollTo(0,0);
    };

    const resetForm = () => {
        isEditing = false;
        currentMatchData = null;
        form.reset();
        editIdInput.value = '';
        formTitle.innerText = "Add New Match";
        cancelBtn.style.display = 'none';
        saveBtn.innerText = "Save Match";
    };

    cancelBtn.addEventListener('click', resetForm);

    const deleteMatch = (id) => {
        if(confirm('Are you sure you want to delete this match?')) {
            remove(ref(db, `matches/${id}`));
            remove(ref(db, `seats/${id}`)); 
        }
    };

    const uploadImage = async (file, path) => {
        if (!file) return null;
        const sRef = storageRef(storage, `${path}/${Date.now()}_${file.name}`);
        await uploadBytes(sRef, file);
        return await getDownloadURL(sRef);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving Data...";

        const matchId = isEditing ? editIdInput.value : push(ref(db, 'matches')).key;
        
        try {
            const t1File = mTeam1.files[0];
            const t2File = mTeam2.files[0];
            const bFile = mBanner.files[0];

            let team1Url = isEditing ? currentMatchData.team1Logo : '';
            let team2Url = isEditing ? currentMatchData.team2Logo : '';
            let bannerUrl = isEditing ? currentMatchData.banner : '';

            if (t1File) team1Url = await uploadImage(t1File, `matches/${matchId}`);
            if (t2File) team2Url = await uploadImage(t2File, `matches/${matchId}`);
            if (bFile) bannerUrl = await uploadImage(bFile, `matches/${matchId}`);

            const matchObj = {
                title: mTitle.value,
                date: mDate.value,
                time: mTime.value,
                venue: mVenue.value,
                price: parseInt(mPrice.value),
                team1Logo: team1Url || 'https://via.placeholder.com/60',
                team2Logo: team2Url || 'https://via.placeholder.com/60',
                banner: bannerUrl || 'https://via.placeholder.com/600x300',
                timestamp: isEditing ? currentMatchData.timestamp : Date.now()
            };

            await set(ref(db, `matches/${matchId}`), matchObj);
            resetForm();
            alert("Match saved successfully! Go to index.html to view.");
        } catch (error) {
            console.error(error);
            alert("Error saving match. Storage/Database rules issue?");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Match";
        }
    });
}
