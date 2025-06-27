// Variabel global
        let sensusData = {};
        let currentBlokKey = "";
        let lastActivity = {
            saved: null,
            verified: null,
            reported: null,
        };
        let reportData = [];
        let unverifiedData = [];
        let currentReportPage = 1;
        let currentUnverifiedPage = 1;
        let pokokSampelTemp = [];
        let editingPokokIndex = null;
        let lastPokokNumber = 0;
        let currentSortColumn = null;
        let currentSortDirection = "asc";

        // Inisialisasi halaman
        window.onload = function () {
            loadFromLocalStorage();
            updateVerifikasiSummary();
            generateReport();

            for (const key in sensusData) {
                const blokData = sensusData[key];
                if (blokData.pokok_sampel && blokData.pokok_sampel.length > 0) {
                    const maxPokok = Math.max(
                        ...blokData.pokok_sampel.map((p) => parseInt(p.no_pokok) || 0)
                    );
                    if (maxPokok > lastPokokNumber) {
                        lastPokokNumber = maxPokok;
                    }
                }
            }

            resetPokokForm();
            renderTabelPokokSampel();

            document.getElementById("report-page-size").onchange =
                setupReportPagination;
            document.getElementById("search-report").oninput =
                setupReportPagination;
            document.getElementById("unverified-page-size").onchange =
                setupUnverifiedPagination;
            document.getElementById("search-unverified").oninput =
                setupUnverifiedPagination;
            companyData = JSON.parse(localStorage.getItem("companyData")) || {};
        };

        // Fungsi membuka tab
        function openTab(evt, tabName) {
            const tabcontent = document.getElementsByClassName("tabcontent");
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }

            const tablinks = document.getElementsByClassName("tablinks");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }

            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";

            if (tabName === "report") {
                generateReport();
            }

            if (tabName === "setting") {
                renderUserTableSetting();
            }
        }

        function getUserActive() {
            let userActive = sessionStorage.getItem("userActive");
            if (!userActive) {
                alert("Silakan isi identitas pengguna terlebih dahulu.");
                showUserAccessModal && showUserAccessModal();
                throw new Error("User not logged in");
            }
            return JSON.parse(userActive);
        }


        // FUNGSI TAB SENSUS
        function getNextPokokNumber() {
            lastPokokNumber++;
            return lastPokokNumber;
        }

        function getNextNoPokok() {
            if (pokokSampelTemp.length === 0) return 1;
            let max = Math.max(
                ...pokokSampelTemp.map((p) => parseInt(p.no_pokok) || 0)
            );
            return max + 1;
        }

        function resetPokokForm() {
            document.getElementById("input-no-pokok").value = getNextPokokNumber(); 
            document.getElementById("input-betina").value = "";
            document.getElementById("input-jantan").value = "";
            document.getElementById("input-note").value = "";
            editingPokokIndex = null;
            document
                .getElementById("pokok-form")
                .querySelector('button[type="submit"]').textContent = "Simpan";
        }

        const numericKeyboardCSS = `
    @media screen and (max-width: 600px) {
        #input-betina, #input-jantan {
            font-size: 18px;
            height: 45px;
        }
        
        #pokok-form .dynamic-row input {
            min-height: 50px;
        }
        
        #pokok-form button[type="submit"] {
            height: 50px;
            font-size: 16px;
        }
    }
`;

        const style = document.createElement("style");
        style.textContent = numericKeyboardCSS;
        document.head.appendChild(style);


        function renderTabelPokokSampel() {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            let noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            noBukit = noBukit === "" ? "0" : noBukit;

            const blokKey = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;

            const tbody = document
                .getElementById("tabel-pokok-sampel")
                .querySelector("tbody");
            tbody.innerHTML = "";

            let pokokArr = sensusData[blokKey] ?.pokok_sampel || [];

            pokokArr
                .slice()
                .reverse()
                .forEach((item, idx) => {
                    let tr = document.createElement("tr");
                    tr.innerHTML = `
            <td>${item.no_pokok}</td>
            <td>${item.bunga_betina}</td>
            <td>${item.bunga_jantan}</td>
            <td>${item.note || ""}</td>
            <td>
                <button type="button" class="edit-btn small-btn" onclick="editPokokSampel(${
                  pokokArr.length - 1 - idx
                })">Edit</button>
                <button type="button" class="delete-btn small-btn" onclick="hapusPokokSampel(${
                  pokokArr.length - 1 - idx
                })">Hapus</button>
            </td>
        `;
                    tbody.appendChild(tr);
                });
            updateTotalPokokSampel();
        }

        function handlePokokFormSubmit() {
            const no_pokok = document.getElementById("input-no-pokok").value.trim();
            let betina = document.getElementById("input-betina").value.trim();
            let jantan = document.getElementById("input-jantan").value.trim();
            const note = document.getElementById("input-note").value.trim();

            betina = betina === "" ? "0" : betina;
            jantan = jantan === "" ? "0" : jantan;

            if (!no_pokok) {
                alert("Isi lengkap semua data pokok!");
                return false;
            }

            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            const luas = document.getElementById("luas").value.trim();
            const jumlahPokok = document
                .getElementById("jumlah_pokok")
                .value.trim();
            const bjr = document.getElementById("bjr").value.trim();
            let noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            noBukit = noBukit === "" ? "0" : noBukit;

            if (
                !estate ||
                !divisi ||
                !blok ||
                !luas ||
                !jumlahPokok ||
                !bjr ||
                !noBaris
            ) {
                alert("Harap isi semua field blok (termasuk No. Bukit)!");
                return false;
            }

            const obj = {
                no_pokok: no_pokok,
                bunga_betina: parseInt(betina),
                bunga_jantan: parseInt(jantan),
                note: note,
                timestamp: new Date().toLocaleString(),
            };

            currentBlokKey = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;

            if (!sensusData[currentBlokKey]) {
                sensusData[currentBlokKey] = {
                    estate: estate,
                    divisi: divisi,
                    blok: blok,
                    luas: parseFloat(luas),
                    jumlah_pokok: parseInt(jumlahPokok),
                    bjr: parseFloat(bjr),
                    no_bukit: noBukit,
                    no_baris: noBaris,
                    pokok_sampel: [],
                    verifikasi: {},
                };
            }

            if (editingPokokIndex === null) {
                
                if (
                    sensusData[currentBlokKey].pokok_sampel.some(
                        (p) => p.no_pokok === no_pokok
                    )
                ) {
                    alert(
                        "No. Pokok sudah ada untuk kombinasi No. Bukit dan No. Baris ini!"
                    );
                    return false;
                }
                sensusData[currentBlokKey].pokok_sampel.push(obj);
                
                if (parseInt(no_pokok) > lastPokokNumber) {
                    lastPokokNumber = parseInt(no_pokok);
                }
            } else {
           
                sensusData[currentBlokKey].pokok_sampel[editingPokokIndex] = obj;
                editingPokokIndex = null;
            }

            saveToLocalStorage();
            updateTotalPokokSampel();
            renderTabelPokokSampel();
            resetPokokForm();
            updateVerifikasiSummary();

            setTimeout(() => {
                const betinaField = document.getElementById("input-betina");
                betinaField.focus();
                betinaField.setAttribute("inputmode", "numeric");
                betinaField.setAttribute("pattern", "[0-9]*");
            }, 100);

            return false;
        }


        function editPokokSampel(idx) {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            let noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            noBukit = noBukit === "" ? "0" : noBukit;

            const blokKey = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;
            const data = sensusData[blokKey] ?.pokok_sampel[idx];
            if (data) {
                document.getElementById("input-no-pokok").value = data.no_pokok;
                document.getElementById("input-betina").value = data.bunga_betina;
                document.getElementById("input-jantan").value = data.bunga_jantan;
                document.getElementById("input-note").value = data.note;
                editingPokokIndex = idx;
                document
                    .getElementById("pokok-form")
                    .querySelector('button[type="submit"]').textContent =
                    "Simpan Perubahan";
            
                lastPokokNumber = parseInt(data.no_pokok) - 1;
            }
        }

        function hapusPokokSampel(idx) {
            if (!confirm("Hapus data pokok ini?")) return;
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            let noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            noBukit = noBukit === "" ? "0" : noBukit;

            const blokKey = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;
            if (sensusData[blokKey]) {
                sensusData[blokKey].pokok_sampel.splice(idx, 1);
                saveToLocalStorage();
                renderTabelPokokSampel();
                updateTotalPokokSampel();
                updateVerifikasiSummary();
            }
        }

        function updateTotalPokokSampel() {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            let noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            noBukit = noBukit === "" ? "0" : noBukit;

            const blokKey = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;
            document.getElementById("total-pokok-sampel").textContent =
                sensusData[blokKey] ?.pokok_sampel.length || 0;
        }

        function barisBaruPokok() {
       
            document.getElementById("no_bukit").value = "";
            document.getElementById("no_baris").value = "";
       
            lastPokokNumber = 0; 
            resetPokokForm();
            renderTabelPokokSampel();
            updateTotalPokokSampel();
            updateVerifikasiSummary();
    
            document.getElementById("no_baris").focus();
        }

        function saveSensusData() {
            const estate = document.getElementById("estate").value.trim();
            const divisi = document.getElementById("divisi").value.trim();
            const blok = document.getElementById("blok").value.trim();
            const luas = document.getElementById("luas").value.trim();
            const jumlahPokok = document
                .getElementById("jumlah_pokok")
                .value.trim();
            const bjr = document.getElementById("bjr").value.trim();
            const noBukit = document.getElementById("no_bukit").value.trim();
            const noBaris = document.getElementById("no_baris").value.trim();

            if (
                !estate ||
                !divisi ||
                !blok ||
                !luas ||
                !jumlahPokok ||
                !bjr ||
                !noBaris
            ) {
                alert(
                    "Harap isi semua field wajib (kecuali No. Bukit yang opsional)!"
                );
                return;
            }

            if (pokokRows.length === 0) {
                alert("Tidak ada data pokok sampel yang dimasukkan!");
                return;
            }

    
            currentBlokKey = `${estate}_${divisi}_${blok}_${noBaris}`;

        
            if (!sensusData[currentBlokKey]) {
                sensusData[currentBlokKey] = {
                    estate: estate,
                    divisi: divisi,
                    blok: blok,
                    luas: parseFloat(luas),
                    jumlah_pokok: parseInt(jumlahPokok),
                    bjr: parseFloat(bjr),
                    no_bukit: noBukit,
                    no_baris: noBaris,
                    pokok_sampel: [],
                    verifikasi: {},
                };
            }

            sensusData[currentBlokKey].pokok_sampel = pokokSampelTemp.map((p) => ({
                ...p,
            }));

            const now = new Date().toLocaleString();
            lastActivity.saved = now;
            document.getElementById(
                "last-saved-sensus"
            ).textContent = `Terakhir disimpan: ${now}`;

            saveToLocalStorage();
            updateVerifikasiSummary();

            alert("Data sensus berhasil disimpan!");
            pokokSampelTemp = [];
            resetPokokForm();
            renderTabelPokokSampel();
            updateStorageBar();
        }


        // FUNGSI UNTUK TAB VERIFIKASI
        function findPokokVerifikasi() {
            const blokKey = document.getElementById("verifikasi-blok").value;
            const noBukit = document.getElementById("verifikasi-no-bukit").value;
            const noBaris = document.getElementById("verifikasi-no-baris").value;
            const level = document.getElementById("verifikasi-level").value;
            if (!blokKey || blokKey === "Pilih Blok") {
                alert("Pilih Blok terlebih dahulu!");
                return;
            }

            if (!noBukit || noBukit === "Pilih No. Bukit") {
                alert("Pilih No. Bukit terlebih dahulu!");
                return;
            }

            if (!noBaris || noBaris === "Pilih No. Baris/Teras") {
                alert("Pilih No. Baris/Teras terlebih dahulu!");
                return;
            }

            const fullKey = `${blokKey}_${noBukit}_${noBaris}`;

            if (!sensusData[fullKey]) {
                alert("Data tidak ditemukan!");
                document.getElementById("verifikasi-data-container").style.display =
                    "none";
                return;
            }

            const blokData = sensusData[fullKey];
            const pokokArr = blokData.pokok_sampel || [];

            if (pokokArr.length === 0) {
                alert("Tidak ada data pokok untuk kriteria ini!");
                document.getElementById("verifikasi-data-container").style.display =
                    "none";
                return;
            }

            renderVerifikasiTable(
                pokokArr.map((p) => ({
                    ...p,
                    blokKey: fullKey,
                })),
                level
            );
            document.getElementById("verifikasi-data-container").style.display =
                "block";
        }

        document
            .querySelector('.tablinks[onclick*="verifikasi"]')
            .addEventListener("click", function () {
                updateBlokDropdown();
                document.getElementById("verifikasi-level").value = "all";
                document.getElementById("verifikasi-data-container").style.display =
                    "none";
            });

        document
            .getElementById("verifikasi-blok")
            .addEventListener("change", function () {
                updateNoBukitDropdown();
            });

        document
            .getElementById("verifikasi-no-bukit")
            .addEventListener("change", function () {
                updateNoBarisDropdown();
            });

        function formatBlokKey(key) {
            if (!key) return "Pilih";
            const parts = key.split("_");
            if (parts.length < 3) return "Pilih";
            return `${parts[0]}${parts[1]}${parts[2]}`;
        }

        function renderVerifikasiTable(pokokData, level) {
            const tableBody = document
                .getElementById("verifikasi-table")
                .getElementsByTagName("tbody")[0];
            tableBody.innerHTML = "";

            let headerHtml = `
        <tr>
            <th class="sortable-header" onclick="sortVerifikasiTable('no_pokok')">No. Pkk</th>
            <th>Kar_B</th>
            <th>Kar_J</th>
            <th>Kar_Note</th>
    `;

            const levelsToShow =
                level === "all" ? ["ast", "askep", "em", "rc", "vpa"] : [level];

            levelsToShow.forEach((lvl) => {
                headerHtml +=
                    `<th>${lvl.toUpperCase()}_B</th><th>${lvl.toUpperCase()}_J</th><th>${lvl.toUpperCase()}_Note</th><th>Aksi</th>`;
            });

            headerHtml += `</tr>`;
            tableBody.innerHTML = headerHtml;

            if (currentSortColumn) {
                const headers = tableBody.querySelectorAll("th");
                headers.forEach((header) => {
                    header.classList.remove("asc", "desc");
                    if (header.textContent.trim() === "No. Pokok") {
                        header.classList.add(currentSortDirection);
                    }
                });
            }

            if (currentSortColumn === "no_pokok") {
                pokokData.sort((a, b) => {
                    const numA = parseInt(a.no_pokok);
                    const numB = parseInt(b.no_pokok);
                    return currentSortDirection === "asc" ? numA - numB : numB - numA;
                });
            }

            pokokData.forEach((pokok) => {
                const blokData = sensusData[pokok.blokKey];
                const row = tableBody.insertRow();

                row.insertCell(0).textContent = pokok.no_pokok;
                row.insertCell(1).textContent = pokok.bunga_betina;
                row.insertCell(2).textContent = pokok.bunga_jantan;
                row.insertCell(3).textContent = pokok.note || "";

                let cellIndex = 4;

                levelsToShow.forEach((lvl) => {
                    const verifData =
                        blokData.verifikasi ?. [lvl] ?. [pokok.no_pokok] || {};
                    const isVerified = !!verifData.bunga_betina ||
                        !!verifData.bunga_jantan ||
                        !!verifData.note;

                    // Bunga Betina
                    const bCell = row.insertCell(cellIndex++);
                    const bInput = document.createElement("input");
                    bInput.type = "number";

                    bInput.value = isVerified ?
                        verifData.bunga_betina !== undefined ?
                        verifData.bunga_betina :
                        0 :
                        pokok.bunga_betina;
                    bInput.dataset.level = lvl;
                    bInput.dataset.type = "b";
                    bInput.dataset.pokok = pokok.no_pokok;
                    bInput.dataset.blokKey = pokok.blokKey;
                    bInput.disabled = isVerified;
                    bInput.style.backgroundColor = isVerified ? "#f0f0f0" : "";
                    bCell.appendChild(bInput);

                    // Bunga Jantan
                    const jCell = row.insertCell(cellIndex++);
                    const jInput = document.createElement("input");
                    jInput.type = "number";
 
                    jInput.value = isVerified ?
                        verifData.bunga_jantan !== undefined ?
                        verifData.bunga_jantan :
                        0 :
                        pokok.bunga_jantan;
                    jInput.dataset.level = lvl;
                    jInput.dataset.type = "j";
                    jInput.dataset.pokok = pokok.no_pokok;
                    jInput.dataset.blokKey = pokok.blokKey;
                    jInput.disabled = isVerified;
                    jInput.style.backgroundColor = isVerified ? "#f0f0f0" : "";
                    jCell.appendChild(jInput);

                    // Note
                    const noteCell = row.insertCell(cellIndex++);
                    const noteInput = document.createElement("input");
                    noteInput.type = "text";
       
                    noteInput.value = isVerified ?
                        verifData.note || "" :
                        pokok.note || "";
                    noteInput.dataset.level = lvl;
                    noteInput.dataset.type = "note";
                    noteInput.dataset.pokok = pokok.no_pokok;
                    noteInput.dataset.blokKey = pokok.blokKey;
                    noteInput.disabled = isVerified;
                    noteInput.style.backgroundColor = isVerified ? "#f0f0f0" : "";
                    noteCell.appendChild(noteInput);

                    const actionCell = row.insertCell(cellIndex++);
                    const actionBtn = document.createElement("button");
                    actionBtn.className = isVerified ?
                        "edit-btn small-btn" :
                        "export-btn small-btn";
                    actionBtn.textContent = isVerified ? "Edit" : "Simpan";
                    actionBtn.dataset.level = lvl;
                    actionBtn.dataset.pokok = pokok.no_pokok;
                    actionBtn.dataset.blokKey = pokok.blokKey;
                    actionBtn.onclick = isVerified ?
                        () => enableEditVerification(pokok.blokKey, pokok.no_pokok, lvl) :
                        () => saveVerification(pokok.blokKey, pokok.no_pokok, lvl);
                    actionCell.appendChild(actionBtn);
                });
            });
        }


        function sortVerifikasiTable(column) {
            if (currentSortColumn === column) {
          
                currentSortDirection =
                    currentSortDirection === "asc" ? "desc" : "asc";
            } else {
            
                currentSortColumn = column;
                currentSortDirection = "asc";
            }

            const blokKey = document.getElementById("verifikasi-blok").value;
            const noBukit = document.getElementById("verifikasi-no-bukit").value;
            const noBaris = document.getElementById("verifikasi-no-baris").value;
            const level = document.getElementById("verifikasi-level").value;

            const fullKey = `${blokKey}_${noBukit}_${noBaris}`;
            const blokData = sensusData[fullKey];
            const pokokArr = blokData ?.pokok_sampel || [];

            renderVerifikasiTable(
                pokokArr.map((p) => ({
                    ...p,
                    blokKey: fullKey,
                })),
                level
            );
        }

   
        function enableEditVerification(blokKey, noPokok, level) {
      
            const inputs = document.querySelectorAll(`
        input[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"]
    `);

  
            inputs.forEach((input) => {
                input.disabled = false;
                input.style.backgroundColor = "";
            });


            const actionBtns = document.querySelectorAll(`
        button[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"]
    `);

            actionBtns.forEach((btn) => {
                btn.textContent = "Simpan";
                btn.className = "export-btn small-btn";
                btn.onclick = () => saveVerification(blokKey, noPokok, level);
            });
        }

      
        function saveVerification(blokKey, noPokok, level) {
            const blokData = sensusData[blokKey];
            if (!blokData) {
                alert("Data blok tidak ditemukan!");
                return;
            }

            const pokok = blokData.pokok_sampel.find((p) => p.no_pokok === noPokok);
            if (!pokok) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

        
            if (!blokData.verifikasi) {
                blokData.verifikasi = {};
            }
            if (!blokData.verifikasi[level]) {
                blokData.verifikasi[level] = {};
            }

    
            const bInput = document.querySelector(`
        input[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"][data-type="b"]
    `);
            const jInput = document.querySelector(`
        input[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"][data-type="j"]
    `);
            const noteInput = document.querySelector(`
        input[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"][data-type="note"]
    `);

           
            const now = new Date().toLocaleString();
            blokData.verifikasi[level][noPokok] = {
                bunga_betina: bInput ? parseInt(bInput.value) || 0 : 0,
                bunga_jantan: jInput ? parseInt(jInput.value) || 0 : 0,
                note: noteInput ? noteInput.value : "",
                timestamp: now,
            };

            // Update pokok timestamp
            pokok.timestamp = now;
            lastActivity.verified = now;
            document.getElementById(
                "last-verified"
            ).textContent = `Terakhir diverifikasi: ${now}`;

            saveToLocalStorage();
            updateVerifikasiSummary();
            updateStorageBar();

            const inputs = document.querySelectorAll(`
        input[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"]
    `);

            inputs.forEach((input) => {
                input.disabled = true;
                input.style.backgroundColor = "#f0f0f0";
            });

            const actionBtns = document.querySelectorAll(`
        button[data-blok-key="${blokKey}"][data-pokok="${noPokok}"][data-level="${level}"]
    `);

            actionBtns.forEach((btn) => {
                btn.textContent = "Edit";
                btn.className = "edit-btn small-btn";
                btn.onclick = () => enableEditVerification(blokKey, noPokok, level);
            });

            alert(`Data verifikasi ${level.toUpperCase()} berhasil disimpan!`);
        }

        document
            .querySelector('.tablinks[onclick*="verifikasi"]')
            .addEventListener("click", function () {
                updateBlokDropdown();
                document.getElementById("verifikasi-level").value = "all";
                document.getElementById("verifikasi-no-bukit").value = "";
                document.getElementById("verifikasi-no-baris").value = "";
                document.getElementById("verifikasi-data-container").style.display =
                    "none";
            });

        const additionalCSS = `
    .export-btn {
        background-color: #f39c12 !important;
    }
    .export-btn:hover {
        background-color: #e67e22 !important;
    }
    .edit-btn {
        background-color: #3498db !important;
    }
    .edit-btn:hover {
        background-color: #2980b9 !important;
    }
    #verifikasi-table input {
        width: 100%;
        padding: 5px;
        box-sizing: border-box;
    }
    #verifikasi-table th, #verifikasi-table td {
        padding: 5px;
        text-align: center;
    }
`;

        const verifikasiCSS = `
    #verifikasi-blok, #verifikasi-no-bukit, #verifikasi-no-baris, #verifikasi-level {
        width: 100%;
        padding: 8px;
        margin: 5px 0;
        box-sizing: border-box;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: white;
    }
    
    #verifikasi-blok:disabled, #verifikasi-no-bukit:disabled, #verifikasi-no-baris:disabled {
        background-color: #f5f5f5;
        color: #777;
    }
    
    .card-form label {
        display: block;
        margin-top: 10px;
        margin-bottom: 3px;
        font-weight: 500;
        color: #555;
    }
    
    .card-form button {
        margin-top: 15px;
        width: 100%;
    }
    
    .card-form button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

        const styleElement = document.createElement("style");
        styleElement.textContent = additionalCSS;
        document.head.appendChild(styleElement);

        const verifikasiStyleElement = document.createElement("style");
        verifikasiStyleElement.textContent = verifikasiCSS;
        document.head.appendChild(verifikasiStyleElement);

        // Enhanced CSS for verification table
        const enhancedVerificationCSS = `
    #verifikasi-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    #verifikasi-table th, #verifikasi-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: center;
    }
    
    #verifikasi-table th {
        background-color: #3498db;
        color: white;
        position: sticky;
        top: 0;
    }
    
    #verifikasi-table input {
        width: 90%;
        padding: 5px;
        box-sizing: border-box;
        border: 1px solid #ddd;
        border-radius: 3px;
        text-align: center;
    }
    
    #verifikasi-table input:disabled {
        background-color: #f0f0f0;
        color: #333;
        border-color: #ddd;
    }
    
    .export-btn {
        background-color: #27ae60 !important;
        color: white !important;
    }
    
    .export-btn:hover {
        background-color: #219653 !important;
    }
    
    .edit-btn {
        background-color: #3498db !important;
        color: white !important;
    }
    
    .edit-btn:hover {
        background-color: #2980b9 !important;
    }
    
    .small-btn {
        padding: 5px 10px;
        font-size: 12px;
        margin: 2px;
    }
    
    .verified-cell {
        background-color: #e8f8f5 !important;
    }
    
    .unverified-cell {
        background-color: #fdedec !important;
    }
`;

        const enhancedStyleElement = document.createElement("style");
        enhancedStyleElement.textContent = enhancedVerificationCSS;
        document.head.appendChild(enhancedStyleElement);

        function parseBlokKey(formatted) {
            if (formatted === "Pilih") return null;

            const estate = formatted.substring(0, 4); 
            const divisi = formatted.substring(4, 5); 
            const blok = formatted.substring(5); 
            return `${estate}_${divisi}_${blok}`;
        }

        
        function updateBlokDropdown() {
            const blokDropdown = document.getElementById("verifikasi-blok");
            blokDropdown.innerHTML = '<option value="">Pilih Blok</option>';

           
            const blokOptions = {};

          
            for (const key in sensusData) {
                const parts = key.split("_");
                if (parts.length < 3) continue;

                const estate = parts[0];
                const divisi = parts[1];
                const blok = parts[2];
                const blokKey = `${estate}_${divisi}_${blok}`;

                
                const displayText = `${estate}${divisi}${blok}`;
                blokOptions[blokKey] = displayText;
            }

      
            for (const [key, display] of Object.entries(blokOptions)) {
                const option = document.createElement("option");
                option.value = key;
                option.textContent = display;
                blokDropdown.appendChild(option);
            }


            document.getElementById("verifikasi-no-bukit").innerHTML =
                '<option value="">Pilih No. Bukit</option>';
            document.getElementById("verifikasi-no-baris").innerHTML =
                '<option value="">Pilih No. Baris/Teras</option>';
            document.getElementById("verifikasi-data-container").style.display =
                "none";
        }


        function updateNoBukitDropdown() {
            const blokKey = document.getElementById("verifikasi-blok").value;
            const noBukitDropdown = document.getElementById("verifikasi-no-bukit");
            noBukitDropdown.innerHTML = '<option value="">Pilih No. Bukit</option>';

            if (!blokKey) return;

            const noBukitOptions = new Set();

            for (const key in sensusData) {
                if (key.startsWith(blokKey + "_")) {
                    const parts = key.split("_");
                    if (parts.length >= 4) {
                        noBukitOptions.add(parts[3]); 
                    }
                }
            }

            Array.from(noBukitOptions)
                .sort()
                .forEach((noBukit) => {
                    const option = document.createElement("option");
                    option.value = noBukit;
                    option.textContent = noBukit;
                    noBukitDropdown.appendChild(option);
                });

            document.getElementById("verifikasi-no-baris").innerHTML =
                '<option value="">Pilih No. Baris/Teras</option>';
            document.getElementById("verifikasi-data-container").style.display =
                "none";
        }

        function updateNoBarisDropdown() {
            const blokKey = document.getElementById("verifikasi-blok").value;
            const noBukit = document.getElementById("verifikasi-no-bukit").value;
            const noBarisDropdown = document.getElementById("verifikasi-no-baris");
            noBarisDropdown.innerHTML =
                '<option value="">Pilih No. Baris/Teras</option>';

            if (!blokKey || !noBukit) return;

            const noBarisOptions = new Set();

            for (const key in sensusData) {
                if (key.startsWith(`${blokKey}_${noBukit}_`)) {
                    const parts = key.split("_");
                    if (parts.length >= 5) {
                        noBarisOptions.add(parts[4]); 
                    }
                }
            }

            Array.from(noBarisOptions)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((noBaris) => {
                    const option = document.createElement("option");
                    option.value = noBaris;
                    option.textContent = noBaris;
                    noBarisDropdown.appendChild(option);
                });

            document.getElementById("verifikasi-data-container").style.display =
                "none";
        }

        function saveVerifikasi() {
            if (!currentVerifikasiData) {
                alert("Tidak ada data yang dipilih untuk diverifikasi!");
                return;
            }

            const level = document.getElementById("verifikasi-level").value;
            const bungaBetina = document.getElementById(
                "verifikasi-bunga-betina"
            ).value;
            const bungaJantan = document.getElementById(
                "verifikasi-bunga-jantan"
            ).value;
            const note = document.getElementById("verifikasi-note").value;

            if (!bungaBetina && !bungaJantan && !note) {
                alert("Harap isi minimal satu field verifikasi!");
                return;
            }

            const blokData = sensusData[currentVerifikasiData.key];
            const pokokIndex = blokData.pokok_sampel.findIndex(
                (p) => p.no_pokok === currentVerifikasiData.no_pokok
            );

            if (pokokIndex === -1) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

            if (!blokData.verifikasi) {
                blokData.verifikasi = {};
            }

            const now = new Date().toLocaleString();

            if (!blokData.verifikasi[level]) {
                blokData.verifikasi[level] = {};
            }

            blokData.verifikasi[level][currentVerifikasiData.no_pokok] = {
                bunga_betina: bungaBetina ? parseInt(bungaBetina) : null,
                bunga_jantan: bungaJantan ? parseInt(bungaJantan) : null,
                note: note || "",
                timestamp: now,
            };

            blokData.pokok_sampel[pokokIndex].timestamp = now;
            lastActivity.verified = now;
            document.getElementById(
                "last-verified"
            ).textContent = `Terakhir diverifikasi: ${now}`;

            saveToLocalStorage();
            updateVerifikasiSummary();
            updateStorageBar();

            alert(`Verifikasi ${level.toUpperCase()} berhasil disimpan!`);
        }

        function updateVerifikasiSummary() {
            let totalPokok = 0;
            let sudahVerifikasi = 0;
            let belumVerifikasi = 0;

            for (const key in sensusData) {
                const blokData = sensusData[key];
                totalPokok += blokData.pokok_sampel.length;

                blokData.pokok_sampel.forEach((pokok) => {
                    let isVerified = false;

                    if (blokData.verifikasi) {
                        for (const level in blokData.verifikasi) {
                            if (blokData.verifikasi[level][pokok.no_pokok]) {
                                isVerified = true;
                                break;
                            }
                        }
                    }

                    if (isVerified) {
                        sudahVerifikasi++;
                    } else {
                        belumVerifikasi++;
                    }
                });
            }


            document.getElementById("total-pokok-verifikasi").textContent =
                totalPokok;
            document.getElementById("sudah-verifikasi").textContent =
                sudahVerifikasi;
            document.getElementById("belum-verifikasi").textContent =
                belumVerifikasi;
                updateStorageBar();
        }


        // FUNGSI UNTUK TAB REPORT
        function generateReport() {
            const level = document.getElementById("report-level").value;
            const semester = document.getElementById("report-semester").value;
            const now = new Date().toLocaleString();
            lastActivity.reported = now;
            document.getElementById(
                "report-timestamp"
            ).textContent = `Terakhir diperbarui: ${now}`;

      
            let blokMap = {}; 

            for (const key in sensusData) {
                const blokData = sensusData[key];

 
                if (semester !== "all") {
                    const dataSemester = getSemesterFromKey(key);
                    if (dataSemester !== semester) continue;
                }

                const blokKey = `${blokData.estate}_${blokData.divisi}_${blokData.blok}`;

                if (!blokMap[blokKey]) {
               
                    blokMap[blokKey] = {
                        estate: blokData.estate,
                        divisi: blokData.divisi,
                        blok: blokData.blok,
                        luas: parseFloat(blokData.luas) || 0,
                        jumlahPokok: parseInt(blokData.jumlah_pokok) || 0,
                        bjr: parseFloat(blokData.bjr) || 0,
                        pokokSampel: 0,
                        bungaBetina: 0,
                        bungaJantan: 0,
                        blokCount: 0, 
                    };
                }
                const summary = blokMap[blokKey];

                summary.pokokSampel += blokData.pokok_sampel.length;
                summary.blokCount += 1;

                blokData.pokok_sampel.forEach((p) => {
                    summary.bungaBetina += p.bunga_betina || 0;
                    summary.bungaJantan += p.bunga_jantan || 0;
                });
            }

            let blokArr = [];
            Object.values(blokMap).forEach((b) => {
  
                const persenSampel =
                    b.jumlahPokok > 0 ? (b.pokokSampel / b.jumlahPokok) * 100 : 0;
                const ratioJantan =
                    b.bungaBetina + b.bungaJantan > 0 ?
                    (b.bungaJantan / (b.bungaBetina + b.bungaJantan)) * 100 :
                    0;
                const janjangPerPokok =
                    b.pokokSampel > 0 ? b.bungaBetina / b.pokokSampel : 0;
          
                const estTonHaSM =
                    b.luas > 0 ?
                    (janjangPerPokok * b.jumlahPokok * b.bjr) / (b.luas * 1000) :
                    0;
                const estTonHa =
                    getCurrentSemester() === "1" ?
                    estTonHaSM / 0.45 :
                    estTonHaSM / 0.55;

                blokArr.push({
                    estate: b.estate,
                    divisi: b.divisi,
                    blok: b.blok,
                    luas: b.luas,
                    jumlahPokok: b.jumlahPokok,
                    pokokSampel: b.pokokSampel,
                    persenSampel,
                    bungaBetina: b.bungaBetina,
                    bungaJantan: b.bungaJantan,
                    ratioJantan,
                    janjangPerPokok,
                    bjr: b.bjr,
                    estTonHaSM,
                    estTonHa,
                });
            });


            let rows = blokArr
                .map(
                    (b) => `
        <tr>
            <td>${b.estate}</td>
            <td>${b.divisi}</td>
            <td>${b.blok}</td>
            <td>${b.luas.toFixed(2)}</td>
            <td>${b.jumlahPokok}</td>
            <td>${b.pokokSampel}</td>
            <td>${b.persenSampel.toFixed(2)}%</td>
            <td>${b.bungaBetina}</td>
            <td>${b.bungaJantan}</td>
            <td>${b.ratioJantan.toFixed(2)}%</td>
            <td>${b.janjangPerPokok.toFixed(2)}</td>
            <td>${b.bjr.toFixed(2)}</td>
            <td>${b.estTonHaSM.toFixed(2)}</td>
            <td>${b.estTonHa.toFixed(2)}</td>
        </tr>
    `
                )
                .join("");

            const totalLuas = blokArr.reduce((a, b) => a + b.luas, 0);
            const totalJumlahPokok = blokArr.reduce((a, b) => a + b.jumlahPokok, 0);
            const totalPokokSampel = blokArr.reduce((a, b) => a + b.pokokSampel, 0);
            const totalBungaBetina = blokArr.reduce((a, b) => a + b.bungaBetina, 0);
            const totalBungaJantan = blokArr.reduce((a, b) => a + b.bungaJantan, 0);
            const totalPersenSampel =
                totalJumlahPokok > 0 ?
                (totalPokokSampel / totalJumlahPokok) * 100 :
                0;
            const totalRatioJantan =
                totalBungaBetina + totalBungaJantan > 0 ?
                (totalBungaJantan / (totalBungaBetina + totalBungaJantan)) * 100 :
                0;
            const totalJanjangPerPokok =
                totalPokokSampel > 0 ? totalBungaBetina / totalPokokSampel : 0;

            // Kalkulasi BJR rata-rata
            const totalBjr =
                blokArr.length > 0 ?
                blokArr.reduce((a, b) => a + b.bjr, 0) / blokArr.length :
                0;
            const totalEstTonHaSM =
                totalLuas > 0 ?
                blokArr.reduce((a, b) => a + b.luas * b.estTonHaSM, 0) / totalLuas :
                0;
            const totalEstTonHa =
                totalLuas > 0 ?
                blokArr.reduce((a, b) => a + b.luas * b.estTonHa, 0) / totalLuas :
                0;

            const tfoot = `
        <tr style="background:#eaf6ff;font-weight:bold">
            <td colspan="3">TOTAL</td>
            <td>${totalLuas.toFixed(2)}</td>
            <td>${totalJumlahPokok}</td>
            <td>${totalPokokSampel}</td>
            <td>${totalPersenSampel.toFixed(2)}%</td>
            <td>${totalBungaBetina}</td>
            <td>${totalBungaJantan}</td>
            <td>${totalRatioJantan.toFixed(2)}%</td>
            <td>${totalJanjangPerPokok.toFixed(2)}</td>
            <td>${totalBjr.toFixed(2)}</td>
            <td>${totalEstTonHaSM.toFixed(2)}</td>
            <td>${totalEstTonHa.toFixed(2)}</td>
        </tr>
    `;

            document.getElementById("rekap-blok-body").innerHTML = rows;
            document.getElementById("rekap-blok-foot").innerHTML = tfoot;

            reportData = [];
            for (const key in sensusData) {
                const blokData = sensusData[key];
                if (semester !== "all") {
                    const dataSemester = getSemesterFromKey(key);
                    if (dataSemester !== semester) continue;
                }
                blokData.pokok_sampel.forEach((pokok) => {
                    const verifikasi = [];
                    if (blokData.verifikasi) {
                        if (level === "all") {
                            for (const lvl in blokData.verifikasi) {
                                if (blokData.verifikasi[lvl][pokok.no_pokok]) {
                                    verifikasi.push({
                                        level: lvl,
                                        ...blokData.verifikasi[lvl][pokok.no_pokok],
                                    });
                                }
                            }
                        } else if (blokData.verifikasi[level] ?. [pokok.no_pokok]) {
                            verifikasi.push({
                                level: level,
                                ...blokData.verifikasi[level][pokok.no_pokok],
                            });
                        }
                    }

                    const ast = blokData.verifikasi ?.ast ?. [pokok.no_pokok] || {};
                    const askep = blokData.verifikasi ?.askep ?. [pokok.no_pokok] || {};
                    const em = blokData.verifikasi ?.em ?. [pokok.no_pokok] || {};
                    const rc = blokData.verifikasi ?.rc ?. [pokok.no_pokok] || {};
                    const vpa = blokData.verifikasi ?.vpa ?. [pokok.no_pokok] || {};

                    reportData.push({
                        estate: blokData.estate,
                        divisi: blokData.divisi,
                        blok: blokData.blok,
                        no_bukit: blokData.no_bukit || "0",
                        no_baris: blokData.no_baris,
                        no_pokok: pokok.no_pokok,
                        bunga_betina: pokok.bunga_betina,
                        bunga_jantan: pokok.bunga_jantan,
                        ast_b: ast.bunga_betina ?? "",
                        ast_j: ast.bunga_jantan ?? "",
                        askep_b: askep.bunga_betina ?? "",
                        askep_j: askep.bunga_jantan ?? "",
                        em_b: em.bunga_betina ?? "",
                        em_j: em.bunga_jantan ?? "",
                        rc_b: rc.bunga_betina ?? "",
                        rc_j: rc.bunga_jantan ?? "",
                        vpa_b: vpa.bunga_betina ?? "",
                        vpa_j: vpa.bunga_jantan ?? "",
                        note: pokok.note,
                        timestamp: pokok.timestamp,
                        semester: getSemesterFromKey(key),
                    });
                });
            }

            setupReportPagination();
        }

        function getCurrentSemester() {
            const month = new Date().getMonth() + 1; 
            // Semester 1: Desember, Januari, Februari
            // Semester 2: Juni, Juli, Agustus
            if (month === 12 || month === 1 || month === 2) {
                return "1";
            } else if (month === 6 || month === 7 || month === 8) {
                return "2";
            } else {
                return "-";
            }
        }

        function getSemesterFromKey(key) {
            return getCurrentSemester();
        }

        function setupReportPagination() {
            const pageSize = parseInt(
                document.getElementById("report-page-size").value
            );
            const searchTerm = document
                .getElementById("search-report")
                .value.trim()
                .toLowerCase();

            const filteredData = reportData.filter((item) => {
                return (
                    item.estate.toLowerCase().includes(searchTerm) ||
                    item.divisi.toString().includes(searchTerm) ||
                    item.blok.toLowerCase().includes(searchTerm) ||
                    item.no_baris.toString().includes(searchTerm) ||
                    item.no_pokok.toString().includes(searchTerm) ||
                    item.note.toLowerCase().includes(searchTerm)
                );
            });

            const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

            if (currentReportPage > totalPages) currentReportPage = totalPages;
            if (currentReportPage < 1) currentReportPage = 1;

            renderReportPage(filteredData, currentReportPage, pageSize, totalPages);
        }

        function renderReportPage(data, page, pageSize, totalPages) {
            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageData = data.slice(startIdx, endIdx);

            const tableBody = document
                .getElementById("report-detail-table")
                .getElementsByTagName("tbody")[0];
            tableBody.innerHTML = "";

            pageData.forEach((item) => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = item.estate;
                row.insertCell(1).textContent = item.divisi;
                row.insertCell(2).textContent = item.blok;
                row.insertCell(3).textContent = item
                    .no_bukit;
                row.insertCell(4).textContent = item.no_baris;
                row.insertCell(5).textContent = item.no_pokok;
                row.insertCell(6).textContent = item.bunga_betina;
                row.insertCell(7).textContent = item.bunga_jantan;
                row.insertCell(8).textContent = item.ast_b || "-";
                row.insertCell(9).textContent = item.ast_j || "-";
                row.insertCell(10).textContent = item.askep_b || "-";
                row.insertCell(11).textContent = item.askep_j || "-";
                row.insertCell(12).textContent = item.em_b || "-";
                row.insertCell(13).textContent = item.em_j || "-";
                row.insertCell(14).textContent = item.rc_b || "-";
                row.insertCell(15).textContent = item.rc_j || "-";
                row.insertCell(16).textContent = item.vpa_b || "-";
                row.insertCell(17).textContent = item.vpa_j || "-";
                row.insertCell(18).textContent = item.note;
                row.insertCell(19).textContent = item.timestamp;
                // Tombol aksi
                const actionCell = row.insertCell(20);
                actionCell.innerHTML = `
            <button onclick="editReportItem('${item.estate}', '${item.divisi}', '${item.blok}', '${item.no_baris}', '${item.no_pokok}')" 
                class="edit-btn small-btn">Edit</button>
            <button onclick="deleteReportItem('${item.estate}', '${item.divisi}', '${item.blok}', '${item.no_baris}', '${item.no_pokok}')" 
                class="delete-btn small-btn">Hapus</button>
        `;
            });

         
            renderPaginationControls(
                "report-pagination",
                currentReportPage,
                totalPages,
                "changeReportPage"
            );
        }


        function changeReportPage(page) {
            currentReportPage = page;
            setupReportPagination();
        }

        // Export report ke Excel
        function exportReportToExcel() {
            if (reportData.length === 0) {
                alert("Tidak ada data report untuk diexport!");
                return;
            }

            let exportData = [];
            let {
                tanggal,
                users
            } = getUserActive();
            let nama = users.map((u) => u.nama).join("; ");
            let jabatan = users.map((u) => u.jabatan).join("; ");

            reportData.forEach((item) => {
                
                const blokKey = `${item.estate}_${item.divisi}_${item.blok}_${item.no_bukit}_${item.no_baris}`;
                const blokData = sensusData[blokKey] || {};

                const rowData = {
                    Estate: item.estate,
                    Divisi: item.divisi,
                    Blok: item.blok,
                    "Luas (Ha)": blokData.luas ?? "-",
                    "Jml Pkk": blokData.jumlah_pokok ?? "-",
                    BJR: blokData.bjr ?? "-",
                    "No. Bukit": blokData.no_bukit ?? "-",
                    "No. Baris/Teras": item.no_baris,
                    "No. Pkk": item.no_pokok,
                    B: item.bunga_betina,
                    J: item.bunga_jantan,
                    Note: item.note,
                    Timestamp: item.timestamp,
                    Smt: item.semester,
                    Tanggal: tanggal,
                    Nama: nama,
                    Jabatan: jabatan,
                };

                // Data verifikasi semua level
                ["ast", "askep", "em", "rc", "vpa"].forEach((level) => {
                    const verif = blokData.verifikasi ?. [level] ?. [item.no_pokok];
                    rowData[`${level.toUpperCase()}_B`] = verif ?.bunga_betina ?? "";
                    rowData[`${level.toUpperCase()}_J`] = verif ?.bunga_jantan ?? "";
                    rowData[`${level.toUpperCase()}_Note`] = verif ?.note ?? "";
                    rowData[`${level.toUpperCase()}_TS`] = verif ?.timestamp ?? "";
                });

                exportData.push(rowData);
            });

            // --- Sheet 2: Data_Rekap ---
            let rekapRows = [];
            const rekapHeader = [
                "Estate",
                "Divisi",
                "Blok",
                "Luas (Ha)",
                "Jumlah Pokok",
                "Pokok Sampel",
                "% Sampel",
                "Bunga Betina",
                "Bunga Jantan",
                "Ratio Bunga Jantan (%)",
                "Janjang/Pokok",
                "BJR",
                "Est. Ton/Ha SM",
                "Est. Ton/Ha",
            ];
            rekapRows.push(rekapHeader);

            // Data per blok
            const tbody = document.getElementById("rekap-blok-body");
            for (let tr of tbody.querySelectorAll("tr")) {
                let row = [];
                for (let td of tr.querySelectorAll("td")) {
                    row.push(td.textContent);
                }
                rekapRows.push(row);
            }

            // Baris total
            const tfoot = document.getElementById("rekap-blok-foot");
            for (let tr of tfoot.querySelectorAll("tr")) {
                let row = [];
                const tds = tr.querySelectorAll("td");
                if (tds[0].hasAttribute("colspan")) {
                    row.push(tds[0].textContent); 
                    row.push("");
                    row.push("");
                    for (let i = 1; i < tds.length; i++) {
                        row.push(tds[i].textContent);
                    }
                    while (row.length < rekapHeader.length) row.push("");
                } else {
                    for (let td of tds) row.push(td.textContent);
                }
                rekapRows.push(row);
            }
          
            const wb = XLSX.utils.book_new();
      
            const ws1 = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws1, "Data_Report");
        
            const ws2 = XLSX.utils.aoa_to_sheet(rekapRows);
            XLSX.utils.book_append_sheet(wb, ws2, "Data_Rekap");

            // Nama File
            let firstRow = reportData[0] || {};
            let estate = (firstRow.estate || "")
                .toString()
                .replace(/[^a-zA-Z0-9]/g, "");
            let divisi = (firstRow.divisi || "")
                .toString()
                .replace(/[^a-zA-Z0-9]/g, "");
            let blok = (firstRow.blok || "")
                .toString()
                .replace(/[^a-zA-Z0-9]/g, "");
            const today = new Date().toISOString().slice(0, 10);
            const fileName = `Report_Sensus_${estate}_${divisi}_${blok}_${today}.xlsx`;

            XLSX.writeFile(wb, fileName);
        }

    
        // FUNGSI GENERAL
        function saveToLocalStorage() {
            const dataToSave = {
                sensusData: sensusData,
                lastActivity: lastActivity,
            };
            localStorage.setItem("sensusProduksiData", JSON.stringify(dataToSave));
            updateStorageBar();
        }

        function loadFromLocalStorage() {
            const savedData = localStorage.getItem("sensusProduksiData");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                sensusData = parsedData.sensusData || {};
                lastActivity = parsedData.lastActivity || {
                    saved: null,
                    verified: null,
                    reported: null,
                };

            
                if (lastActivity.saved) {
                    document.getElementById(
                        "last-saved-sensus"
                    ).textContent = `Terakhir disimpan: ${lastActivity.saved}`;
                }
                if (lastActivity.verified) {
                    document.getElementById(
                        "last-verified"
                    ).textContent = `Terakhir diverifikasi: ${lastActivity.verified}`;
                }
                if (lastActivity.reported) {
                    document.getElementById(
                        "report-timestamp"
                    ).textContent = `Terakhir diperbarui: ${lastActivity.reported}`;
                }
            }
        }

        function confirmDeleteAllData() {
            if (
                confirm(
                    "Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!"
                )
            ) {
                deleteAllData();
            }
        }

        function deleteAllData() {
           
            sensusData = {};
            lastActivity = {
                saved: null,
                verified: null,
                reported: null,
            };

            
            localStorage.removeItem("sensusProduksiData");
           
            document.getElementById("last-saved-sensus").textContent =
                "Terakhir disimpan: -";
            document.getElementById("last-verified").textContent =
                "Terakhir diverifikasi: -";
            document.getElementById("report-timestamp").textContent =
                "Terakhir diperbarui: -";

            lastPokokNumber = 0;

            updateVerifikasiSummary();
            generateReport();
            resetPokokForm();
            updateStorageBar();

            alert(
                "Semua data sensus, verifikasi, dan report telah dihapus! Data daftar user di tab Setting tetap utuh."
            );
        }

 
        function showImportModal() {
            document.getElementById("import-modal").style.display = "block";
        }

    
        function closeImportModal() {
            document.getElementById("import-modal").style.display = "none";
        }

        function importFromExcel() {
            const fileInput = document.getElementById("import-file");
            const file = fileInput.files[0];

            if (!file) {
                alert("Pilih file Excel terlebih dahulu!");
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: "array",
                });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    alert("File Excel kosong atau format tidak sesuai!");
                    return;
                }

                importAllSensusAndVerifikasiData(jsonData);

                closeImportModal();
            };

            reader.readAsArrayBuffer(file);
        }

        function importAllSensusAndVerifikasiData(data) {
            sensusData = {};

            data.forEach((row) => {
                const estate = row["Estate"] || "";
                const divisi = row["Divisi"] || "";
                const blok = row["Blok"] || "";
                const noBaris = row["No. Baris/Teras"] || "";
                const noBukit = row["No. Bukit"] || "0"; 

                if (!estate || !divisi || !blok || !noBaris) return;

                const key = `${estate}_${divisi}_${blok}_${noBukit}_${noBaris}`;

                if (!sensusData[key]) {
                    sensusData[key] = {
                        estate: estate,
                        divisi: divisi,
                        blok: blok,
                        luas: parseFloat(row["Luas (Ha)"]) || 0,
                        jumlah_pokok: parseInt(row["Jml Pkk"]) || 0,
                        bjr: parseFloat(row["BJR"]) || 0,
                        no_bukit: noBukit,
                        no_baris: noBaris,
                        pokok_sampel: [],
                        verifikasi: {},
                    };
                }

                if (row["No. Pkk"]) {
                    sensusData[key].pokok_sampel.push({
                        no_pokok: row["No. Pkk"].toString(),
                        bunga_betina: parseInt(row["B"]) || 0,
                        bunga_jantan: parseInt(row["J"]) || 0,
                        note: row["Note"] || "",
                        timestamp: row["Timestamp"] || new Date().toLocaleString(),
                    });
                }

                const pokokNo = row["No. Pkk"] ? row["No. Pkk"].toString() : "";

                // Daftar level verifikasi
                const verificationLevels = [{
                        level: "ast",
                        prefix: "AST_",
                    },
                    {
                        level: "askep",
                        prefix: "ASKEP_",
                    },
                    {
                        level: "em",
                        prefix: "EM_",
                    },
                    {
                        level: "rc",
                        prefix: "RC_",
                    },
                    {
                        level: "vpa",
                        prefix: "VPA_",
                    },
                ];

                verificationLevels.forEach((lv) => {
                    const bb = row[`${lv.prefix}B`];
                    const bj = row[`${lv.prefix}J`];
                    const note = row[`${lv.prefix}Note`];
                    const ts = row[`${lv.prefix}TS`];

                    if (
                        bb !== undefined ||
                        bj !== undefined ||
                        note !== undefined ||
                        ts !== undefined
                    ) {
                        if (!sensusData[key].verifikasi[lv.level]) {
                            sensusData[key].verifikasi[lv.level] = {};
                        }

                        const verifData = {};
                        if (bb !== undefined) verifData.bunga_betina = parseInt(bb) || 0;
                        if (bj !== undefined) verifData.bunga_jantan = parseInt(bj) || 0;
                        if (note !== undefined) verifData.note = note;
                        if (ts !== undefined) verifData.timestamp = ts;

                        if (Object.keys(verifData).length > 0) {
                            sensusData[key].verifikasi[lv.level][pokokNo] = verifData;
                        }
                    }
                });
            });

            saveToLocalStorage();
            updateVerifikasiSummary();
            generateReport();
            updateStorageBar();

            alert(
                `Data sensus & verifikasi berhasil diimport! Total ${data.length} baris diproses.`
            );
        }

        function showUnverifiedModal() {
            
            unverifiedData = [];

            for (const key in sensusData) {
                const blokData = sensusData[key];

                blokData.pokok_sampel.forEach((pokok) => {
                    let isVerified = false;

                
                    if (blokData.verifikasi) {
                        for (const level in blokData.verifikasi) {
                            if (blokData.verifikasi[level][pokok.no_pokok]) {
                                isVerified = true;
                                break;
                            }
                        }
                    }

                    if (!isVerified) {
                        unverifiedData.push({
                            estate: blokData.estate,
                            divisi: blokData.divisi,
                            blok: blokData.blok,
                            no_baris: blokData.no_baris,
                            no_pokok: pokok.no_pokok,
                            bunga_betina: pokok.bunga_betina,
                            bunga_jantan: pokok.bunga_jantan,
                            note: pokok.note,
                            timestamp: pokok.timestamp,
                        });
                    }
                });
            }

            document.getElementById("unverified-count").textContent =
                unverifiedData.length;

            document.getElementById("unverified-modal").style.display = "block";

            setupUnverifiedPagination();
        }

        function closeUnverifiedModal() {
            document.getElementById("unverified-modal").style.display = "none";
        }

        function setupUnverifiedPagination() {
            const pageSize = parseInt(
                document.getElementById("unverified-page-size").value
            );
            const searchTerm = document
                .getElementById("search-unverified")
                .value.trim()
                .toLowerCase();

            const filteredData = unverifiedData.filter((item) => {
                return (
                    item.estate.toLowerCase().includes(searchTerm) ||
                    item.divisi.toString().includes(searchTerm) ||
                    item.blok.toLowerCase().includes(searchTerm) ||
                    item.no_baris.toString().includes(searchTerm) ||
                    item.no_pokok.toString().includes(searchTerm) ||
                    item.note.toLowerCase().includes(searchTerm)
                );
            });

            const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

            if (currentUnverifiedPage > totalPages)
                currentUnverifiedPage = totalPages;
            if (currentUnverifiedPage < 1) currentUnverifiedPage = 1;

            renderUnverifiedPage(
                filteredData,
                currentUnverifiedPage,
                pageSize,
                totalPages
            );
        }

        function renderUnverifiedPage(data, page, pageSize, totalPages) {
            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageData = data.slice(startIdx, endIdx);

            const tableBody = document
                .getElementById("unverified-table")
                .getElementsByTagName("tbody")[0];
            tableBody.innerHTML = "";

            pageData.forEach((item) => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = item.estate;
                row.insertCell(1).textContent = item.divisi;
                row.insertCell(2).textContent = item.blok;
                row.insertCell(3).textContent =
                    sensusData[
                        `${item.estate}_${item.divisi}_${item.blok}_${item.no_baris}`
                    ] ?.no_bukit || "-"; 
                row.insertCell(4).textContent = item.no_baris;
                row.insertCell(5).textContent = item.no_pokok;
                row.insertCell(6).textContent = item.bunga_betina;
                row.insertCell(7).textContent = item.bunga_jantan;
                row.insertCell(8).textContent = item.note;

                const actionCell = row.insertCell(9);
                actionCell.innerHTML = `
        <button onclick="verifyFromUnverifiedModal('${item.estate}', '${item.divisi}', '${item.blok}', '${item.no_baris}', '${item.no_pokok}')" 
            class="small-btn">Verifikasi</button>
    `;
            });

            renderPaginationControls(
                "unverified-pagination",
                currentUnverifiedPage,
                totalPages,
                "changeUnverifiedPage"
            );
        }

        function changeUnverifiedPage(page) {
            currentUnverifiedPage = page;
            setupUnverifiedPagination();
        }

        function verifyFromUnverifiedModal(
            estate,
            divisi,
            blok,
            noBaris,
            noPokok
        ) {
            const key = `${estate}_${divisi}_${blok}_${noBaris}`;

            if (!sensusData[key]) {
                alert("Data blok tidak ditemukan!");
                return;
            }

            const pokok = sensusData[key].pokok_sampel.find(
                (p) => p.no_pokok === noPokok
            );
            if (!pokok) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

            document.getElementById("verifikasi-no-baris").value = noBaris;
            document.getElementById("verifikasi-no-pokok").value = noPokok;
            document.getElementById("verifikasi-bunga-betina").value =
                pokok.bunga_betina;
            document.getElementById("verifikasi-bunga-jantan").value =
                pokok.bunga_jantan;
            document.getElementById("verifikasi-note").value = pokok.note;

            document.getElementById("verifikasi-data-container").style.display =
                "block";

            currentVerifikasiData = {
                key: key,
                no_pokok: noPokok,
            };

            closeUnverifiedModal();
            document.getElementsByClassName("tablinks")[1].click();
        }

        function renderPaginationControls(
            containerId,
            currentPage,
            totalPages,
            changeFunction
        ) {
            const container = document.getElementById(containerId);
            container.innerHTML = "";

            if (totalPages <= 1) return;

            const prevBtn = document.createElement("button");
            prevBtn.textContent = "Prev";
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => window[changeFunction](currentPage - 1);
            container.appendChild(prevBtn);

            const maxVisiblePages = 5;
            let startPage = Math.max(
                1,
                currentPage - Math.floor(maxVisiblePages / 2)
            );
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                const firstBtn = document.createElement("button");
                firstBtn.textContent = "1";
                firstBtn.onclick = () => window[changeFunction](1);
                container.appendChild(firstBtn);

                if (startPage > 2) {
                    const ellipsis = document.createElement("span");
                    ellipsis.textContent = "...";
                    container.appendChild(ellipsis);
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement("button");
                pageBtn.textContent = i;
                pageBtn.disabled = i === currentPage;
                pageBtn.onclick = () => window[changeFunction](i);
                container.appendChild(pageBtn);
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement("span");
                    ellipsis.textContent = "...";
                    container.appendChild(ellipsis);
                }

                const lastBtn = document.createElement("button");
                lastBtn.textContent = totalPages;
                lastBtn.onclick = () => window[changeFunction](totalPages);
                container.appendChild(lastBtn);
            }

            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next";
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => window[changeFunction](currentPage + 1);
            container.appendChild(nextBtn);
        }

        function showImportVerifikasiModal() {
            document.getElementById("import-type").value = "verifikasi";
            showImportModal();
        }

        function editReportItem(estate, divisi, blok, noBaris, noPokok) {
          
            let foundKey = null;
            let foundPokok = null;
            for (const key in sensusData) {
                const parts = key.split("_");
                if (
                    parts[0] === estate &&
                    parts[1] === divisi &&
                    parts[2] === blok &&
                    parts[4] === noBaris 
                ) {
             
                    const pokok = sensusData[key].pokok_sampel.find(
                        (p) => p.no_pokok === noPokok
                    );
                    if (pokok) {
                        foundKey = key;
                        foundPokok = pokok;
                        break;
                    }
                }
            }

            if (!foundKey) {
                alert("Data blok tidak ditemukan!");
                return;
            }
            if (!foundPokok) {
                alert("Data pokok tidak ditemukan!");
                return;
            }

 
            document.getElementsByClassName("tablinks")[0].click();
            document.getElementById("estate").value = estate;
            document.getElementById("divisi").value = divisi;
            document.getElementById("blok").value = blok;
            document.getElementById("luas").value = sensusData[foundKey].luas;
            document.getElementById("jumlah_pokok").value = sensusData[foundKey].jumlah_pokok;
            document.getElementById("bjr").value = sensusData[foundKey].bjr;
            document.getElementById("no_bukit").value = sensusData[foundKey].no_bukit || "";
            document.getElementById("no_baris").value = sensusData[foundKey].no_baris;

            pokokSampelTemp = sensusData[foundKey].pokok_sampel ?
                sensusData[foundKey].pokok_sampel.map((p) => ({
                    ...p
                })) : [];
            resetPokokForm();
            renderTabelPokokSampel();
            window.scrollTo(0, document.getElementById("sensus").offsetTop);
        }


        function deleteReportItem(estate, divisi, blok, noBaris, noPokok) {
            if (
                !confirm(`Apakah Anda yakin ingin menghapus data pokok ${noPokok}?`)
            )
                return;

            const key = `${estate}_${divisi}_${blok}_${noBaris}`;

            if (!sensusData[key]) {
                alert("Data blok tidak ditemukan!");
                return;
            }

            sensusData[key].pokok_sampel = sensusData[key].pokok_sampel.filter(
                (p) => p.no_pokok !== noPokok
            );

            if (sensusData[key].verifikasi) {
                for (const level in sensusData[key].verifikasi) {
                    if (sensusData[key].verifikasi[level][noPokok]) {
                        delete sensusData[key].verifikasi[level][noPokok];
                    }
                }
            }

            if (sensusData[key].pokok_sampel.length === 0) {
                delete sensusData[key];
            }

            saveToLocalStorage();
            updateVerifikasiSummary();
            generateReport();
            renderUserRows();
            updateStorageBar();

            alert(`Data pokok ${noPokok} berhasil dihapus!`);
        }

        // Sinkronisasi ke Google Sheet
        function syncToGoogleSheet() {
            const btn = document.getElementById("sync-btn");
            const status = document.getElementById("sync-status");
            btn.disabled = true;
            status.textContent = "Mengirim data...";

            let exportData = [];
            let {
                tanggal,
                users
            } = getUserActive();
            let nama = users.map((u) => u.nama).join("; ");
            let jabatan = users.map((u) => u.jabatan).join("; ");

            for (const key in sensusData) {
                const blokData = sensusData[key];
                blokData.pokok_sampel.forEach((pokok) => {
                    const rowData = {
                        Estate: blokData.estate,
                        Divisi: blokData.divisi,
                        Blok: blokData.blok,
                        "Luas (Ha)": blokData.luas,
                        "Jml Pkk": blokData.jumlah_pokok,
                        BJR: blokData.bjr,
                        "No. Bukit": blokData.no_bukit,
                        "No. Baris/Teras": blokData.no_baris,
                        "No. Pkk": pokok.no_pokok,
                        B: pokok.bunga_betina,
                        J: pokok.bunga_jantan,
                        Note: pokok.note,
                        Timestamp: pokok.timestamp,
                        Semester: getSemesterFromKey(key),
                        Tanggal: tanggal,
                        Nama: nama,
                        Jabatan: jabatan,
                    };

                    ["ast", "askep", "em", "rc", "vpa"].forEach((level) => {
                        const verif = blokData.verifikasi ?. [level] ?. [pokok.no_pokok];
                        rowData[`${level.toUpperCase()}_B`] = verif ?.bunga_betina ?? "";
                        rowData[`${level.toUpperCase()}_J`] = verif ?.bunga_jantan ?? "";
                        rowData[`${level.toUpperCase()}_Note`] = verif ?.note ?? "";
                        rowData[`${level.toUpperCase()}_TS`] = verif ?.timestamp ?? "";
                    });

                    exportData.push(rowData);
                });
            }

            // 2. Data Rekap
            let rekapRows = [];

            const tbody = document.getElementById("rekap-blok-body");
            for (let tr of tbody.querySelectorAll("tr")) {
                let row = [];
                for (let td of tr.querySelectorAll("td")) {
                    row.push(td.textContent);
                }
                rekapRows.push(row);
            }

            const tfoot = document.getElementById("rekap-blok-foot");
            for (let tr of tfoot.querySelectorAll("tr")) {
                let row = [];
                row.push("TOTAL");
                row.push("");
                row.push("");
                let tds = tr.querySelectorAll("td");
                for (let i = 3; i < tds.length; i++) {
                    row.push(tds[i].textContent);
                }
                rekapRows.push(row);
            }
            // Header
            const rekapHeader = [
                "Estate",
                "Divisi",
                "Blok",
                "Luas (Ha)",
                "Jumlah Pokok",
                "Pokok Sampel",
                "% Sampel",
                "Bunga Betina",
                "Bunga Jantan",
                "Ratio Bunga Jantan (%)",
                "Janjang/Pokok",
                "BJR",
                "Est. Ton/Ha SM",
                "Est. Ton/Ha",
            ];
            rekapRows.unshift(rekapHeader);

            // SYNC GAS
            const GOOGLE_APPS_SCRIPT_URL =
                "https://script.google.com/macros/s/AKfycbwN_M0WEYmV640eW4E47FDusO3Yb2ZdcewfK7HiNtVS_CSvaBfdACqPohO2s7m0UzWfCg/exec";

            fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "sync",
                        data_report: exportData,
                        data_rekap: rekapRows,
                    }),
                })
                .then(() => {
                    status.textContent = "✅ Sukses!";
                    btn.disabled = false;
                })
                .catch((err) => {
                    status.textContent = "❌ Gagal: " + err;
                    btn.disabled = false;
                });
        }

        // TAB SETTING

        function renderUserTableSetting() {
            let userList = JSON.parse(localStorage.getItem("userList") || "[]");
            const tbody = document.querySelector("#setting-user-table tbody");
            tbody.innerHTML = "";

            if (userList.length === 0) {
                const row = tbody.insertRow();
                row.insertCell(0).colSpan = 3;
                row.cells[0].textContent = "Belum ada data user.";
                row.cells[0].style.textAlign = "center";
            } else {
                userList.forEach((user, i) => {
                    const row = tbody.insertRow();
                    row.insertCell(0).textContent = user.nama;
                    row.insertCell(1).textContent = user.jabatan;
                    const aksiCell = row.insertCell(2);
                    aksiCell.innerHTML = `
                <button class="delete-btn small-btn" onclick="deleteUserSetting(${i})" title="Hapus">&#128465;</button>
            `;
                });
            }

            renderCompanyDataTable();
        }

        function renderCompanyDataTable() {
            const tbody = document.querySelector("#company-data-table tbody");
            tbody.innerHTML = "";

            for (const estate in companyData) {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = estate;
                row.insertCell(1).textContent = companyData[estate].company || "-";
                row.insertCell(2).textContent = companyData[estate].estateName || "-";

                const actionCell = row.insertCell(3);
                actionCell.innerHTML = `
            <button class="delete-btn small-btn" onclick="deleteCompanyData('${estate}')">Hapus</button>
        `;
            }

            if (Object.keys(companyData).length === 0) {
                const row = tbody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 4;
                cell.textContent = "Belum ada data perusahaan";
                cell.style.textAlign = "center";
            }
        }

        function deleteUserSetting(idx) {
            if (!confirm("Hapus user ini dari daftar?")) return;
            let userList = JSON.parse(localStorage.getItem("userList") || "[]");
            userList.splice(idx, 1);
            localStorage.setItem("userList", JSON.stringify(userList));
            renderUserTableSetting();
            updateStorageBar();

        }

        function renderCompanyDataTable() {
            const tbody = document.querySelector("#company-data-table tbody");
            tbody.innerHTML = "";

            for (const estate in companyData) {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = estate;
                row.insertCell(1).textContent = companyData[estate].company || "-";
                row.insertCell(2).textContent = companyData[estate].estateName || "-";

                const actionCell = row.insertCell(3);
                actionCell.innerHTML = `
            <button class="delete-btn small-btn" onclick="deleteCompanyData('${estate}')">Hapus</button>
        `;
            }

            if (Object.keys(companyData).length === 0) {
                const row = tbody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 4;
                cell.textContent = "Belum ada data perusahaan";
                cell.style.textAlign = "center";
            }
        }

        function deleteCompanyData(estate) {
            if (confirm(`Hapus data perusahaan untuk estate ${estate}?`)) {
                delete companyData[estate];
                localStorage.setItem("companyData", JSON.stringify(companyData));
                renderCompanyDataTable();
                updateStorageBar();
            }
        }

        document.getElementById("setting-user-form").onsubmit = function (e) {
            e.preventDefault();
            let nama = document.getElementById("setting-nama").value.trim();
            let jabatan = document.getElementById("setting-jabatan").value.trim();
            if (!nama || !jabatan) return alert("Nama dan Jabatan wajib diisi!");
            let userList = JSON.parse(localStorage.getItem("userList") || "[]");
            if (userList.some((u) => u.nama.toLowerCase() === nama.toLowerCase())) {
                return alert("Nama sudah ada di daftar.");
            }
            userList.push({
                nama,
                jabatan,
            });
            localStorage.setItem("userList", JSON.stringify(userList));
            document.getElementById("setting-nama").value = "";
            document.getElementById("setting-jabatan").value = "";
            renderUserTableSetting();
        };

        // TEMPLATE IMPORT DATA

        function downloadTemplateImport() {
            const headers = [
                "Estate",
                "Divisi",
                "Blok",
                "Luas (Ha)",
                "Jml Pkk",
                "BJR",
                "No. Bukit",
                "No. Baris/Teras",
                "No. Pkk",
                "B",
                "J",
                "Note",
                "Timestamp",
                "AST_B",
                "AST_J",
                "AST_Note",
                "AST_TS",
                "ASKEP_B",
                "ASKEP_J",
                "ASKEP_Note",
                "ASKEP_TS",
                "EM_B",
                "EM_J",
                "EM_Note",
                "EM_TS",
                "RC_B",
                "RC_J",
                "RC_Note",
                "RC_TS",
                "VPA_B",
                "VPA_J",
                "VPA_Note",
                "VPA_TS",
            ];

            // Contoh baris data kosong
            const sample = [{
                Estate: "KHTE",
                Divisi: "1",
                Blok: "G-12",
                "Luas (Ha)": "30",
                "Jml Pkk": "4080",
                BJR: "15",
                "No. Bukit": "1",
                "No. Baris/Teras": "3",
                "No. Pkk": "1",
                B: "8",
                J: "2",
                Note: "",
                Timestamp: "",
                AST_B: "8",
                AST_J: "2",
                AST_Note: "",
                AST_TS: "",
                ASKEP_B: "",
                ASKEP_J: "",
                ASKEP_Note: "",
                ASKEP_TS: "",
                EM_B: "",
                EM_J: "",
                EM_Note: "",
                EM_TS: "",
                RC_B: "",
                RC_J: "",
                RC_Note: "",
                RC_TS: "",
                VPA_B: "",
                VPA_J: "",
                VPA_Note: "",
                VPA_TS: "",
            }, ];

            const ws = XLSX.utils.json_to_sheet(sample, {
                header: headers,
            });

            XLSX.utils.sheet_add_aoa(ws, [headers], {
                origin: "A1",
            });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template_Import");


            XLSX.writeFile(wb, "Template_Import_Sensus_Produksi_Kelapa_Sawit.xlsx");
        }

        // MODAL USER ACCESS
        let userList = JSON.parse(localStorage.getItem("userList") || "[]");
        let userRows = [];

        function renderUserRows() {
            const section = document.getElementById("user-list-section");
            section.innerHTML = "";

            userRows.forEach((user, idx) => {
                section.innerHTML += `
                <div class="dynamic-row" style="margin-bottom:5px">
                    <input list="userlist-nama" type="text" id="input-nama-${idx}" placeholder="Nama" required value="${
            user.nama || ""
          }" 
                        oninput="handleNamaInput(${idx})" autocomplete="off">
                    <datalist id="userlist-nama">
                        ${JSON.parse(localStorage.getItem("userList") || "[]")
                          .map((u) => `<option value="${u.nama}"></option>`)
                          .join("")}
                    </datalist>
                    <input type="text" id="input-jabatan-${idx}" placeholder="Jabatan" required value="${
            user.jabatan || ""
          }" onchange="userRows[${idx}].jabatan=this.value">
                    ${
                      userRows.length > 1
                        ? `<button type="button" onclick="removeUserRow(${idx})" class="small-btn" style="background:#e74c3c">&#128465;</button>`
                        : ""
                    }
                </div>
            `;
            });

            if (userRows.length === 0) addUserRow();
        }

        function addUserRow(
            val = {
                nama: "",
                jabatan: "",
            }
        ) {
            userRows.push(val);
            renderUserRows();
        }

        function removeUserRow(idx) {
            userRows.splice(idx, 1);
            renderUserRows();
        }

        function handleNamaInput(idx) {
            const namaInput = document.getElementById(`input-nama-${idx}`);
            const jabatanInput = document.getElementById(`input-jabatan-${idx}`);
            const nama = namaInput.value.trim();
            userRows[idx].nama = nama;

            const userList = JSON.parse(localStorage.getItem("userList") || "[]");
            const found = userList.find(
                (u) => u.nama.toLowerCase() === nama.toLowerCase()
            );

            if (found) {
                jabatanInput.value = found.jabatan;
                userRows[idx].jabatan = found.jabatan;
            } else {
                jabatanInput.value = userRows[idx].jabatan || "";
            }
        }

        function showUserAccessModal() {
            const today = new Date();
            const formattedDate = today.toISOString().split("T")[0];
            document.getElementById("input-tanggal").value = formattedDate;

            const userList = JSON.parse(localStorage.getItem("userList") || "[]");

            userRows = [];

            if (userList.length > 0) {
                addUserRow({
                    nama: userList[0].nama,
                    jabatan: userList[0].jabatan,
                });
            } else {

                addUserRow();
            }

            document.getElementById("user-access-modal").style.display = "block";
            document.body.style.overflow = "hidden";
        }

        document.getElementById("user-access-form").onsubmit = function (e) {
            e.preventDefault();
            const tanggal = document.getElementById("input-tanggal").value;
            const users = userRows.filter((u) => u.nama && u.jabatan);

            if (!tanggal || users.length === 0) {
                alert("Tanggal dan minimal 1 Nama/Jabatan wajib diisi!");
                return;
            }

            const userActive = {
                tanggal,
                users,
            };
            sessionStorage.setItem("userActive", JSON.stringify(userActive));

            const userList = JSON.parse(localStorage.getItem("userList") || "[]");

            users.forEach((user) => {
                const existingUser = userList.find(
                    (u) => u.nama.toLowerCase() === user.nama.toLowerCase()
                );
                if (!existingUser) {
                    userList.push({
                        nama: user.nama,
                        jabatan: user.jabatan,
                    });
                }
            });

            localStorage.setItem("userList", JSON.stringify(userList));

            document.getElementById("user-access-modal").style.display = "none";
            document.body.style.overflow = "";

            if (document.getElementById("setting").style.display === "block") {
                renderUserTableSetting();
            }
        };

        window.addEventListener("DOMContentLoaded", showUserAccessModal);

        // MINIMIZE TABLE
        function toggleTableExpand(containerId, btn) {
            const wrap = document.getElementById(containerId);
            wrap.classList.toggle("expanded");
            btn.textContent = wrap.classList.contains("expanded") ?
                "Sembunyikan" :
                "Lihat Lengkap";
        }

        // Dark mode
        document.addEventListener("DOMContentLoaded", function () {

            const darkModeEnabled = localStorage.getItem("darkMode") === "enabled";
            if (darkModeEnabled) {
                document.body.classList.add("dark-mode");
            }

            if (!document.getElementById("darkModeToggle")) {
                const darkModeToggle = document.createElement("button");
                darkModeToggle.id = "darkModeToggle";
                darkModeToggle.innerHTML = darkModeEnabled ? "☀️" : "🌙";
                darkModeToggle.title = "Toggle Dark Mode";
                document.body.appendChild(darkModeToggle);

                darkModeToggle.addEventListener("click", function () {
                    document.body.classList.toggle("dark-mode");
                    const isDarkMode = document.body.classList.contains("dark-mode");
                    localStorage.setItem(
                        "darkMode",
                        isDarkMode ? "enabled" : "disabled"
                    );
                    darkModeToggle.innerHTML = isDarkMode ? "☀️" : "🌙";

                    const darkModeSwitch = document.getElementById("dark-mode-switch");
                    if (darkModeSwitch) {
                        darkModeSwitch.checked = isDarkMode;
                    }
                });
            }

            const darkModeSwitch = document.getElementById("dark-mode-switch");
            if (darkModeSwitch) {
                darkModeSwitch.checked = darkModeEnabled;
                darkModeSwitch.addEventListener("change", function () {
                    document.body.classList.toggle("dark-mode", this.checked);
                    localStorage.setItem(
                        "darkMode",
                        this.checked ? "enabled" : "disabled"
                    );

                    const darkModeToggle = document.getElementById("darkModeToggle");
                    if (darkModeToggle) {
                        darkModeToggle.innerHTML = this.checked ? "☀️" : "🌙";
                    }
                });
            }
        });

        const originalOpenTab = openTab;
        openTab = function (evt, tabName) {
            originalOpenTab(evt, tabName);

            if (tabName === "setting") {
                const darkModeEnabled =
                    localStorage.getItem("darkMode") === "enabled";
                const darkModeSwitch = document.getElementById("dark-mode-switch");
                if (darkModeSwitch) {
                    darkModeSwitch.checked = darkModeEnabled;
                }
            }
        };

        let companyData = JSON.parse(localStorage.getItem("companyData")) || {};

        function showPrintModal() {
            const modal = document.getElementById("print-modal");
            modal.style.display = "block";

            const estateSelect = document.getElementById("print-estate");
            estateSelect.innerHTML = '<option value="">Pilih Estate</option>';

            const estates = new Set();
            for (const key in sensusData) {
                const estate = key.split('_')[0];
                estates.add(estate);
            }

            estates.forEach(estate => {
                const option = document.createElement('option');
                option.value = estate;
                option.textContent = estate;
                estateSelect.appendChild(option);
            });

            if (estates.size === 0) {
                const option = document.createElement('option');
                option.value = "KHTE";
                option.textContent = "KHTE";
                estateSelect.appendChild(option);
            }

            const selectedEstate = estateSelect.value || Array.from(estates)[0] || "KHTE";
            updatePrintFields(selectedEstate);
        }

        function closePrintModal() {
            document.getElementById("print-modal").style.display = "none";
        }

        function updatePrintFields(estate) {
            const estateSelect = document.getElementById("print-estate");
            const blokSelect = document.getElementById("print-blok");
            const companyInput = document.getElementById("print-company");
            const estateNameInput = document.getElementById("print-estate-name");

            estate = estate || estateSelect.value;

            blokSelect.innerHTML = '<option value="">Pilih Blok</option>';

            const bloks = new Set();
            for (const key in sensusData) {
                const parts = key.split('_');
                if (parts[0] === estate) {
                    bloks.add(parts[2]); 
                }
            }

            bloks.forEach(blok => {
                const option = document.createElement('option');
                option.value = blok;
                option.textContent = blok;
                blokSelect.appendChild(option);
            });

            if (bloks.size === 0) {
                const option = document.createElement('option');
                option.value = "G-12";
                option.textContent = "G-12";
                blokSelect.appendChild(option);
            }

            if (companyData[estate]) {
                companyInput.value = companyData[estate].company || "";
                estateNameInput.value = companyData[estate].estateName || "";
            } else {
                companyInput.value = "";
                estateNameInput.value = "";
            }
        }

        document.getElementById("print-estate").addEventListener('change', function () {
            updatePrintFields();
        });

        function loadPDFLibrary(callback) {
            if (typeof jsPDF !== 'undefined' && typeof autoTable !== 'undefined') {
                callback();
                return;
            }

            const script1 = document.createElement('script');
            script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script1.onload = function () {
                const script2 = document.createElement('script');
                script2.src =
                    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
                script2.onload = callback;
                document.head.appendChild(script2);
            };
            document.head.appendChild(script1);
        }

        function generatePDF() {
            loadPDFLibrary(function () {
                const {
                    jsPDF
                } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                // 1. Ambil input
                const estate = document.getElementById("print-estate").value;
                const blok = document.getElementById("print-blok").value;
                const company = document.getElementById("print-company").value;
                const estateName = document.getElementById("print-estate-name").value;
                const blokDataArr = getBlokDataArr(estate, blok);

                if (!blokDataArr.length) {
                    alert("Data blok tidak ditemukan!");
                    return;
                }

                let bukitBarisArr = [],
                    pokokArr = [];
                const bukitBarisSet = new Set();
                const pokokSet = new Set();

                blokDataArr.forEach(bd => {
                    bd.pokok_sampel.forEach(pokok => pokokSet.add(pokok.no_pokok));
                    bukitBarisSet.add(`${bd.no_bukit}||${bd.no_baris}`);
                });
                bukitBarisArr = Array.from(bukitBarisSet)
                    .map(str => {
                        const [bukit, baris] = str.split('||');
                        return {
                            bukit,
                            baris
                        };
                    })
                    .sort((a, b) => {
                        const compBukit = (parseInt(a.bukit) || a.bukit).toString().localeCompare((parseInt(
                            b.bukit) || b.bukit).toString(), 'id', {
                            numeric: true
                        });
                        if (compBukit !== 0) return compBukit;
                        return (parseInt(a.baris) || a.baris).toString().localeCompare((parseInt(b.baris) ||
                            b.baris).toString(), 'id', {
                            numeric: true
                        });
                    });
                pokokArr = Array.from(pokokSet)
                    .sort((a, b) => (parseInt(a) || a).toString().localeCompare((parseInt(b) || b).toString(),
                        'id', {
                            numeric: true
                        }));

                const cellData = {};
                blokDataArr.forEach(bd => {
                    bd.pokok_sampel.forEach(pokok => {
                        const k = `${pokok.no_pokok}_${bd.no_bukit}_${bd.no_baris}`;
            
                        let kary =
                            `${pokok.bunga_betina ?? '-'} | ${pokok.bunga_jantan ?? '-'}`;
                       
                        let ast = bd.verifikasi ?.ast ?. [pokok.no_pokok];
                        let askep = bd.verifikasi ?.askep ?. [pokok.no_pokok];
                        let astAskep = '';
                        if (
                            ast &&
                            ((parseInt(ast.bunga_betina) > 0) || (parseInt(ast.bunga_jantan) >
                                0))
                        ) {
                            astAskep = `${ast.bunga_betina ?? ''} | ${ast.bunga_jantan ?? ''}`;
                        } else if (
                            askep &&
                            ((parseInt(askep.bunga_betina) > 0) || (parseInt(askep
                                .bunga_jantan) > 0))
                        ) {
                            astAskep =
                                `${askep.bunga_betina ?? ''} | ${askep.bunga_jantan ?? ''}`;
                        }

                   
                        let em = bd.verifikasi ?.em ?. [pokok.no_pokok];
                        let rc = bd.verifikasi ?.rc ?. [pokok.no_pokok];
                        let emRc = '';
                        if (
                            em &&
                            ((parseInt(em.bunga_betina) > 0) || (parseInt(em.bunga_jantan) > 0))
                        ) {
                            emRc = `${em.bunga_betina ?? ''} | ${em.bunga_jantan ?? ''}`;
                        } else if (
                            rc &&
                            ((parseInt(rc.bunga_betina) > 0) || (parseInt(rc.bunga_jantan) > 0))
                        ) {
                            emRc = `${rc.bunga_betina ?? ''} | ${rc.bunga_jantan ?? ''}`;
                        }

                        cellData[k] = {
                            kary,
                            astAskep,
                            emRc
                        };
                    });
                });


                const maxSetPerPage = 3;
                let pageIdx = 0;
                for (let colStart = 0; colStart < bukitBarisArr.length; colStart += maxSetPerPage) {
                    if (pageIdx > 0) doc.addPage();
                    pageIdx++;

                    let bukitBarisSub = bukitBarisArr.slice(colStart, colStart + maxSetPerPage);
                    while (bukitBarisSub.length < maxSetPerPage) {
                        bukitBarisSub.push({
                            bukit: '-',
                            baris: '-'
                        });
                    }

                    addCustomHeaderPortrait(doc, company, estateName, estate, blok, blokDataArr, bukitBarisSub,
                        pageIdx, Math.ceil(bukitBarisArr.length / maxSetPerPage));

                    let headRows = [
                        [{
                                content: 'No. Pokok',
                                rowSpan: 2
                            },
                            ...bukitBarisSub.map(bb => ({
                                content: (bb.bukit !== '-' ?
                                    `No. Bukit: ${bb.bukit}\nNo. Baris: ${bb.baris}` : ''),
                                colSpan: 3,
                                styles: {
                                    halign: 'center'
                                }
                            }))
                        ],
                        [
                            ...bukitBarisSub.flatMap(bb => [{
                                    content: 'Kary',
                                    styles: {
                                        fontStyle: 'bold',
                                        textColor: [255, 255, 255]
                                    }
                                },
                                {
                                    content: 'Ast/Askep',
                                    styles: {
                                        fontStyle: 'bold',
                                        textColor: [255, 255, 255]
                                    }
                                },
                                {
                                    content: 'EM/RC',
                                    styles: {
                                        fontStyle: 'bold',
                                        textColor: [255, 255, 255]
                                    }
                                }
                            ])
                        ]
                    ];

                    let bodyRows = pokokArr.map(noPokok => {
                        let row = [noPokok];
                        bukitBarisSub.forEach(bb => {
                            if (bb.bukit !== '-') {
                                const dat = cellData[`${noPokok}_${bb.bukit}_${bb.baris}`];
                                if (dat) {
                                    row.push(dat.kary);
                                    row.push(dat.astAskep);
                                    row.push(dat.emRc);
                                } else {
                                    row.push('-');
                                    row.push('-');
                                    row.push('-');
                                }
                            } else {
                                row.push('');
                                row.push('');
                                row.push('');
                            }
                        });
                        return row;
                    });
                 
                    while (bodyRows.length < 35) {
                        let emptyRow = [''];
                        bukitBarisSub.forEach(() => emptyRow.push('', '', ''));
                        bodyRows.push(emptyRow);
                    }

                    doc.autoTable({
                        startY: 32,
                        head: headRows,
                        body: bodyRows,
                        margin: {
                            left: 12,
                            right: 12
                        },
                        styles: {
                            fontSize: 7,
                            minCellHeight: 5,
                            halign: 'center',
                            valign: 'middle'
                        },
                        headStyles: {
                            fillColor: [41, 128, 185],
                            textColor: 255,
                            fontStyle: 'bold'
                        },
                        columnStyles: Object.fromEntries([...Array(10).keys()]
                            .map(i => [i, {
                                cellWidth: (180 / 10)
                            }]))
                    });

                    if (colStart + maxSetPerPage >= bukitBarisArr.length) {
                        addCustomFooterPortrait(doc, blokDataArr, bukitBarisArr, pokokArr, cellData);
                    }
                }

                doc.save(`SensusMtx_${estate}_${blok}_${new Date().toISOString().slice(0,10)}.pdf`);
            });
        }

        function getBlokDataArr(estate, blok) {
            const arr = [];
            for (const key in sensusData) {
                const parts = key.split('_');
                if (parts[0] === estate && parts[2] === blok) arr.push(sensusData[key]);
            }
            return arr;
        }

        function addCustomHeaderPortrait(doc, company, estateName, estate, blok, blokDataArr, bukitBarisSub, page,
            totalPages) {
            doc.setFontSize(9);
            doc.text(company, 8, 8);
            doc.text(estateName, 8, 12);

            doc.setFontSize(9);
            doc.text('FORM SENSUS PRODUKSI', 105, 13, {
                align: 'center'
            });

            doc.setFontSize(9);
            let blokLineY = 22;
            let dataTeks = [];
            let divisi = blokDataArr[0] ?.divisi ?? '-'; 

            for (let i = 0; i < bukitBarisSub.length; i += 3) {
                const blk1 = bukitBarisSub[i];
                let txt = `Divisi: ${divisi} | Blok: ${blok}`;
                dataTeks.push(txt);
            }
            dataTeks.forEach((t, idx) => doc.text(t, 8, blokLineY + idx * 6));
            let l = blokDataArr[0];
            doc.text(
                `Luas: ${l?.luas ?? '-'} Ha | Jml Pokok: ${l?.jumlah_pokok ?? '-'} | BJR: ${l?.bjr ?? '-'}`,
                8,
                blokLineY + dataTeks.length * 6
            );

            let tgl = "-";
            if (blokDataArr[0] ?.pokok_sampel ?.length) tgl = blokDataArr[0].pokok_sampel[0].timestamp ?.split(',')[
                0] || "-";
            doc.text(`Tanggal: ${tgl}`, 150, 17);

            // Petugas
            const userActive = JSON.parse(sessionStorage.getItem("userActive") || "{}");

            let petugasArr = [];
            if (userActive.users) {
                petugasArr = userActive.users.map(u => {
                    let parts = (u.nama || '').trim().split(/\s+/);
                    return parts[0] || '';
                }).filter(nama => nama);
            }

            let petugasText = [];
            for (let i = 0; i < petugasArr.length; i += 3) {
                petugasText.push(petugasArr.slice(i, i + 3).join(', '));
            }

            petugasText.forEach((line, idx) => {
                doc.text(`Petugas: ${line}`, 150, 22 + idx * 4);
            });

            doc.text(`${page} dari ${totalPages}`, 185, 13);
        }

        function addCustomFooterPortrait(doc, blokDataArr, bukitBarisArr, pokokArr, cellData) {
            const finalY = doc.lastAutoTable.finalY + 10;
           
            let totalPkk = 0,
                totalJjg = 0;
            pokokArr.forEach(noPokok => {
                bukitBarisArr.forEach(bb => {
                    const dat = cellData[`${noPokok}_${bb.bukit}_${bb.baris}`];
                    if (dat) {
                        let jjg = parseInt((dat.kary.split('|')[0] || '0').trim());
                        if (!isNaN(jjg)) totalJjg += jjg;
                        totalPkk++;
                    }
                });
            });
            const jjgPerPkk = totalPkk > 0 ? (totalJjg / totalPkk).toFixed(2) : '0.00';

            doc.setFontSize(10);
            doc.text(`Total pkk sensus: ${totalPkk}   |   Total jjg sensus: ${totalJjg}   |   Jjg/Pkk: ${jjgPerPkk}`,
                12, finalY);

            const now = new Date();
            doc.text(`dicetak: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 12, finalY + 5);

            doc.setFontSize(10);
            doc.text('Petugas Sensus      |      Asisten      |      Askep      |      EM      |      RC', 12, finalY +
                13);
        }

        function generatePrint() {
            const estate = document.getElementById("print-estate").value;
            const blok = document.getElementById("print-blok").value;
            const company = document.getElementById("print-company").value;
            const estateName = document.getElementById("print-estate-name").value;

            if (!estate || !blok) {
                alert("Harap pilih Estate dan Blok terlebih dahulu!");
                return;
            }

            if (!companyData[estate]) {
                companyData[estate] = {};
            }
            companyData[estate].company = company;
            companyData[estate].estateName = estateName;
            localStorage.setItem("companyData", JSON.stringify(companyData));

            generatePDF();

            closePrintModal();
        }

        // Aktif Tracking
        let trackingActive = false;
        let trackingPaused = false;
        let trackingWatchId = null;
        let trackingData = [];
        let trackingStartTime = null;
        let trackingPauseTime = null;

        // Start Tracking
        function startTracking() {
            if (!navigator.geolocation) {
                alert('Perangkat tidak mendukung GPS!');
                return;
            }
            if (trackingActive && !trackingPaused) return;
            trackingActive = true;
            trackingPaused = false;
            trackingData = trackingData || [];
            trackingStartTime = trackingStartTime || Date.now();
            trackingPauseTime = null;
            document.getElementById("btnTrackStart").disabled = true;
            document.getElementById("btnTrackPause").disabled = false;
            document.getElementById("btnTrackStop").disabled = false;
            updateTrackingStatus("Perekaman dimulai...");

            // Start
            trackingWatchId = navigator.geolocation.watchPosition(
                pos => {
                    const {
                        latitude,
                        longitude,
                        accuracy
                    } = pos.coords;
                    trackingData.push({
                        timestamp: Date.now(),
                        latitude,
                        longitude,
                        accuracy
                    });
                    updateTrackingStatus(
                        `Tracking: ${trackingData.length} titik. Lokasi: (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
                    );
                },
                err => {
                    updateTrackingStatus("Gagal ambil lokasi: " + err.message);
                }, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000
                }
            );
        }

        // Pause
        function pauseTracking() {
            if (!trackingActive || trackingPaused) return;
            trackingPaused = true;
            if (trackingWatchId !== null) {
                navigator.geolocation.clearWatch(trackingWatchId);
                trackingWatchId = null;
            }
            trackingPauseTime = Date.now();
            document.getElementById("btnTrackStart").disabled = false;
            document.getElementById("btnTrackPause").disabled = true;
            document.getElementById("btnTrackStop").disabled = false;
            updateTrackingStatus("Tracking dijeda (pause).");
        }

        // Stop dan simpan tracking
        function stopTracking() {
            if (!trackingActive) return;
            trackingActive = false;
            trackingPaused = false;
            if (trackingWatchId !== null) {
                navigator.geolocation.clearWatch(trackingWatchId);
                trackingWatchId = null;
            }
            document.getElementById("btnTrackStart").disabled = false;
            document.getElementById("btnTrackPause").disabled = true;
            document.getElementById("btnTrackStop").disabled = true;

            if (trackingData.length > 1) {

                let history = JSON.parse(localStorage.getItem("trackingHistory") || "[]");
       
                let estate = document.getElementById("estate") ?.value ?.trim() || "-";
                let divisi = document.getElementById("divisi") ?.value ?.trim() || "-";
                let blok = document.getElementById("blok") ?.value ?.trim() || "-";
                let namaBlok = `${estate}${divisi}${blok}`;
                history.push({
                    id: Date.now(),
                    date: new Date(trackingStartTime).toLocaleString(),
                    duration: trackingPauseTime ?
                        trackingPauseTime - trackingStartTime : Date.now() - trackingStartTime,
                    points: trackingData,
                    blok: namaBlok
                });
                localStorage.setItem("trackingHistory", JSON.stringify(history));
                updateTrackingStatus(
                    `Tracking disimpan (${trackingData.length} titik, durasi: ${Math.round((Date.now() - trackingStartTime)/1000)} detik)`
                );
            } else {
                updateTrackingStatus("Tidak ada data tracking disimpan.");
            }
            trackingData = [];
            trackingStartTime = null;
            trackingPauseTime = null;

            renderTrackingHistoryTable();
        }


        function updateTrackingStatus(msg) {
            document.getElementById("tracking-status").textContent = msg;
        }

        document.addEventListener("DOMContentLoaded", function () {
            document.getElementById("btnTrackStart").disabled = false;
            document.getElementById("btnTrackPause").disabled = true;
            document.getElementById("btnTrackStop").disabled = true;
            renderTrackingHistoryTable();
        });

        function renderTrackingHistoryTable() {
            const table = document.getElementById("tracking-history-table").getElementsByTagName("tbody")[0];
            let history = JSON.parse(localStorage.getItem("trackingHistory") || "[]");
            table.innerHTML = "";
            if (history.length === 0) {
                const row = table.insertRow();
                let cell = row.insertCell(0);
                cell.colSpan = 5;
                cell.textContent = "Belum ada data tracking.";
                return;
            }
           
            history.slice().reverse().forEach((item, idx) => {
                let row = table.insertRow();
                row.insertCell(0).textContent = item.date;
                row.insertCell(1).textContent = item.blok || "-";
                row.insertCell(2).textContent = msToTime(item.duration);
                row.insertCell(3).textContent = item.points.length;
                let cellAksi = row.insertCell(4);
                cellAksi.innerHTML = `
            <button class="export-btn small-btn" onclick="exportTrackingKML(${item.id})">Export KML</button>
            <button class="delete-btn small-btn" onclick="deleteTrackingHistory(${item.id})">Hapus</button>
        `;
            });
        }


        // Export ke .kml
        function exportTrackingKML(id) {
            let history = JSON.parse(localStorage.getItem("trackingHistory") || "[]");
            let item = history.find(h => h.id === id);
            if (!item || !item.points || item.points.length < 2) {
                alert("Data tracking tidak valid!");
                return;
            }

            function pad2(n) {
                return n.toString().padStart(2, "0");
            }
            let firstTimestamp = item.points[0].timestamp;
            let dt = new Date(firstTimestamp);
            let YY = pad2(dt.getFullYear() % 100);
            let MM = pad2(dt.getMonth() + 1);
            let DD = pad2(dt.getDate());
            let HH = pad2(dt.getHours());
            let mm = pad2(dt.getMinutes());
            let ss = pad2(dt.getSeconds());
            let namaBlok = (item.blok || "-").replace(/[^a-zA-Z0-9\-]/g, "");

            let fileName = `${YY}${MM}${DD}${HH}${mm}${ss}_TrackingSP_${namaBlok}.kml`;

            let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>Tracking Sensus ${item.date} [${namaBlok}]</name>
<Placemark>
  <name>Rute Sensus (${namaBlok})</name>
  <LineString>
    <tessellate>1</tessellate>
    <coordinates>
      ${item.points.map(pt => `${pt.longitude},${pt.latitude},0`).join("\n      ")}
    </coordinates>
  </LineString>
</Placemark>
</Document>
</kml>`;
 
            let blob = new Blob([kml], {
                type: "application/vnd.google-earth.kml+xml"
            });
            let a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Hapus history tracking
        function deleteTrackingHistory(id) {
            if (!confirm("Hapus history tracking ini?")) return;
            let history = JSON.parse(localStorage.getItem("trackingHistory") || "[]");
            history = history.filter(h => h.id !== id);
            localStorage.setItem("trackingHistory", JSON.stringify(history));
            renderTrackingHistoryTable();
            updateStorageBar();
        }

        function msToTime(duration) {
            let seconds = Math.floor((duration / 1000) % 60),
                minutes = Math.floor((duration / (1000 * 60)) % 60),
                hours = Math.floor(duration / (1000 * 60 * 60));
            return `${hours > 0 ? hours + "j " : ""}${minutes}m ${seconds}s`;
        }

        const originalOpenTab2 = openTab;
        openTab = function (evt, tabName) {
            originalOpenTab2(evt, tabName);
            if (tabName === "setting") {
                renderTrackingHistoryTable();
            }
        };


        // BAR STATUS PENGGUNAAN LOCAL STORAGE
        function getLocalStorageUsage() {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                total += key.length + (val ? val.length : 0);
            }
            return total;
        }

        function updateStorageBar() {
            const usedBytes = getLocalStorageUsage();
            const maxBytes = 5 * 1024 * 1024;
            const percent = Math.min(usedBytes / maxBytes * 100, 100);
            let color = "#3498db";
            if (percent > 80) color = "#e74c3c"; 
            else if (percent > 60) color = "#f1c40f";

            // Update bar
            const bar = document.getElementById("storage-bar");
            bar.style.width = percent + "%";
            bar.style.background = color;

            // Info teks
            const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
            const freeMB = (maxBytes / (1024 * 1024)).toFixed(0);
            let info = `${usedMB} MB free of ${freeMB} MB`;

            const infoText = document.getElementById("storage-info-text");
            infoText.textContent = info;
        }

        document.addEventListener("DOMContentLoaded", function () {
            updateStorageBar();
        });

        // ========== GEO MAP SETUP ==========
let map, trackingPolyline, positionMarker;
let placemarks = JSON.parse(localStorage.getItem("placemarks_TO") || "[]");

// Init Map
function initGeoMap() {
  if (map) return;
  map = L.map('geo-map').setView([-2.5, 112.5], 14); // ganti center sesuai lokasi kebun
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: ''
  }).addTo(map);
  trackingPolyline = L.polyline([], {color: '#ff5500', weight: 4}).addTo(map);
  positionMarker = L.circleMarker([0,0], {radius:7,color:'red',fillColor:'#f66',fillOpacity:1}).addTo(map);
  renderAllPlacemarks();
}

// Update Peta saat tracking berjalan
function updateGeoMap(trackingArr) {
  if (!map) return;
  if (!trackingArr || trackingArr.length === 0) return;
  const latlngs = trackingArr.map(pt => [pt.latitude, pt.longitude]);
  trackingPolyline.setLatLngs(latlngs);
  let last = latlngs[latlngs.length-1];
  if (last) {
    positionMarker.setLatLng(last);
    map.panTo(last, {animate:true,duration:0.5});
  }
}

// Event tracking: Panggil fungsi ini saat ada perubahan trackingData
// Contoh: updateGeoMap(trackingData);

// Add Placemark
document.getElementById('btnAddPlacemark').onclick = function() {
  if (!map || !positionMarker) return;
  let latlng = positionMarker.getLatLng();
  let note = document.getElementById('placemarkNote').value.trim() || "-";
  let color = document.getElementById('placemarkColor').value;
  placemarks.push({
    lat: latlng.lat,
    lng: latlng.lng,
    note: note,
    color: color,
    created: new Date().toISOString()
  });
  localStorage.setItem("placemarks_TO", JSON.stringify(placemarks));
  renderAllPlacemarks();
  renderPlacemarkTable();
  document.getElementById('placemarkNote').value = '';
};

// Tampilkan semua placemark di map
function renderAllPlacemarks() {
  if (!map) return;
  // Hapus semua layer lama
  if (window._placemarkLayers) window._placemarkLayers.forEach(m=>map.removeLayer(m));
  window._placemarkLayers = [];
  placemarks.forEach(p => {
    let marker = L.circleMarker([p.lat, p.lng], {
      radius: 9,
      color: p.color,
      fillColor: p.color,
      fillOpacity: 0.7
    }).addTo(map).bindPopup(
      `<b>${p.note}</b><br>Lat: ${p.lat.toFixed(6)}, Lng: ${p.lng.toFixed(6)}<br>Warna: ${p.color}`
    );
    window._placemarkLayers.push(marker);
  });
}

// Table placemark
function renderPlacemarkTable() {
  let tbody = document.getElementById('placemarkTable').querySelector('tbody');
  tbody.innerHTML = '';
  placemarks.forEach((p,i) => {
    let tr = tbody.insertRow();
    tr.insertCell(0).textContent = i+1;
    tr.insertCell(1).textContent = p.lat.toFixed(6);
    tr.insertCell(2).textContent = p.lng.toFixed(6);
    tr.insertCell(3).textContent = p.note;
    tr.insertCell(4).textContent = p.color;
    let delBtn = document.createElement('button');
    delBtn.textContent = "Hapus";
    delBtn.className = "btn btn-danger";
    delBtn.onclick = function(){
      placemarks.splice(i,1);
      localStorage.setItem("placemarks_TO", JSON.stringify(placemarks));
      renderAllPlacemarks();
      renderPlacemarkTable();
    };
    let td5 = tr.insertCell(5);
    td5.appendChild(delBtn);
  });
}

// Export placemark ke .KML
document.getElementById('exportPlacemarkKML').onclick = function() {
  if (!placemarks.length) return alert("Tidak ada placemark.");
  let kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Placemarks TO</name>`;
  placemarks.forEach((p,i) => {
    kml += `<Placemark><name>${p.note||'Placemark '+(i+1)}</name>
      <Style><IconStyle><color>${colorToKMLHex(p.color)}</color></IconStyle></Style>
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
    </Placemark>`;
  });
  kml += `</Document></kml>`;
  let blob = new Blob([kml], {type:"application/vnd.google-earth.kml+xml"});
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `placemark_TO_${(new Date()).toISOString().replace(/\W/g,'').slice(0,12)}.kml`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

function colorToKMLHex(c) {
  // KML pakai format aabbggrr (ARGB) → contoh merah 'ff0000ff'
  const map = {red:"ff0000ff", blue:"ffff0000", green:"ff00ff00", orange:"ff00a5ff", purple:"ffff00ff"};
  return map[c]||"ff0000ff";
}

// Panggil init map saat DOM siap
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(initGeoMap,300); // delay agar container ter-render
  renderPlacemarkTable();
});

// ========== INTEGRASI DENGAN TRACKING ==========
/*
Jika aplikasi tracking Anda sudah punya variabel `trackingData` (array koordinat),
cukup panggil updateGeoMap(trackingData) di event:
- Setelah push titik baru ke trackingData (saat watchPosition sukses)
- Saat tracking dimulai/dimuat ulang
Contoh:
  trackingData.push({...});
  updateGeoMap(trackingData);
*/

// Anda juga bisa tambahkan updateGeoMap(trackingData) di callback GPS tracking aplikasi Anda