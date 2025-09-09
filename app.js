const messageContainer = document.getElementById('messageContainer');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const inventoryTypes = ['reagent', 'equipment', 'consumable', 'glassware'];

// Utility Functions
function showMessage(message, type = 'success') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    messageContainer.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

function getStatusBadgeClass(status) {
    if (!status) return '';
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus === 'ok') return 'status-ok';
    if (lowercaseStatus.includes('low') || lowercaseStatus.includes('due')) return 'status-warning';
    if (lowercaseStatus.includes('expired') || lowercaseStatus.includes('damaged') ||
        lowercaseStatus.includes('missing') || lowercaseStatus.includes('out')) return 'status-error';
    return 'status-ok';
}

function renderStatusBadge(status) {
    if (!status) return '';
    const badgeClass = getStatusBadgeClass(status);
    return `<span class="status-badge ${badgeClass}">${status}</span>`;
}

// Tab functionality
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const tabId = tab.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');
    });
});

document.getElementById('downloadReportBtn').addEventListener('click', async () => {
    try {
        showMessage('Generating monthly laboratory report...', 'success');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Monthly Lab Report');

        // Get current date for report title
        const now = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const reportDate = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

        // Add company header
        worksheet.getCell('B2').value = 'ATLANTIC FLUIDS AND INTEGRATED SERVICES LIMITED';
        worksheet.getCell('B2').font = { bold: true };
        worksheet.mergeCells('B2:D2');

        // Add report title
        worksheet.getCell('B3').value = 'MONTHLY LABORATORY REPORT';
        worksheet.getCell('B3').font = { bold: true };
        worksheet.mergeCells('B3:D3');

        // Add period covered
        worksheet.getCell('B4').value = `PERIOD COVERED: 1ST TO 31ST ${monthNames[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
        worksheet.mergeCells('B4:D4');

        // Add empty row
        worksheet.addRow([]);

        // SECTION A: PERSONNEL/LAB
        worksheet.getCell('A6').value = 'A';
        worksheet.getCell('B6').value = 'PERSONNEL/LAB';
        worksheet.mergeCells('B6:D6');

        // Get personnel data from Firestore (you'll need to create a 'personnel' collection)
        // For now, we'll use sample data - you should replace this with actual data
        const personnelData = [
            ['', 'TOTAL NUMBER OF STAFF IN TECHNICAL DEPARTMENT', '', 4],
            ['', 'MANAGER', '', 1],
            ['', 'SUPERVISOR', '', 1],
            ['', 'INTERN(S)', '', 3]
        ];

        personnelData.forEach(row => {
            worksheet.addRow(row);
        });

        // Add empty row
        worksheet.addRow([]);

        // SECTION B: LAB TEST REPORT
        worksheet.getCell('A12').value = 'B';
        worksheet.getCell('B12').value = 'LAB TEST REPORT';
        worksheet.mergeCells('B12:D12');

        // Add test report headers
        const testHeaders = ['S/N', 'CHEMICAL TESTED', 'VENDOR', 'STATUS', 'REMARK'];
        worksheet.addRow(testHeaders);

        // Get test data from Firestore (you'll need a 'labTests' collection)
        try {
            const testSnapshot = await db.collection('labTests').orderBy('chemicalTested').get();
            let testSn = 1;

            if (!testSnapshot.empty) {
                testSnapshot.forEach(doc => {
                    const test = doc.data();
                    worksheet.addRow([
                        testSn++,
                        test.chemicalTested || '',
                        test.vendor || '',
                        test.status || '',
                        test.remark || ''
                    ]);
                });
            } else {
                // Fallback to sample data if no tests in database
                const testData = [
                    [1, 'Full mud check', 'SHAFNET', '', 'Properties were reported'],
                    [2, 'Zinc Bromide check', 'SVS (UAE)', 'PASSED', 'Product were received']
                ];
                testData.forEach(row => {
                    worksheet.addRow(row);
                });
            }
        } catch (error) {
            console.error('Error loading lab tests:', error);
            // Fallback to sample data if error occurs
            const testData = [
                [1, 'Full mud check', 'SHAFNET', '', 'Properties were reported'],
                [2, 'Zinc Bromide check', 'SVS (UAE)', 'PASSED', 'Product were received']
            ];
            testData.forEach(row => {
                worksheet.addRow(row);
            });
        }

        // Add empty row
        worksheet.addRow([]);

        // SECTION C: REAGENT INVENTORY
        worksheet.getCell('A23').value = 'C';
        worksheet.getCell('B23').value = 'REAGENT INVENTORY';
        worksheet.mergeCells('B23:D23');

        // Add reagent headers
        const reagentHeaders = ['S/N', 'REAGENT', 'SIZE', 'OPENING STOCK', 'QUANTITY USED(LAB)', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'STATUS', 'REMARKS'];
        worksheet.addRow(reagentHeaders);

        // Get reagent data from Firestore
        const reagentSnapshot = await collections.reagent.orderBy('name').get();
        let reagentSn = 1;

        reagentSnapshot.forEach(doc => {
            const reagent = doc.data();
            worksheet.addRow([
                reagentSn++,
                reagent.name || '',
                reagent.size || '',
                reagent.stock || 0,
                reagent.labStock || 0,
                reagent.loadOutLocation || '', // Changed from loadOut/location to loadOutLocation
                reagent.closingBalance || 0,
                reagent.status || '',
                reagent.remarks || ''
            ]);
        });

        // Add empty row
        worksheet.addRow([]);

        // SECTION D: EQUIPMENT INVENTORY
        const equipmentStartRow = worksheet.rowCount + 1;
        worksheet.getCell(`A${equipmentStartRow}`).value = 'D';
        worksheet.getCell(`B${equipmentStartRow}`).value = 'EQUIPMENT INVENTORY';
        worksheet.mergeCells(`B${equipmentStartRow}:D${equipmentStartRow}`);

        // Add equipment headers
        const equipmentHeaders = ['S/N', 'DESCRIPTION', 'OPENING STOCK', 'QUANTITY IN STORE', 'LAB STOCK', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'CALIBRATION STATUS', 'EQUIPMENT STATUS'];
        worksheet.addRow(equipmentHeaders);

        // Get equipment data from Firestore
        const equipmentSnapshot = await collections.equipment.orderBy('description').get();
        let equipmentSn = 1;

        equipmentSnapshot.forEach(doc => {
            const equipment = doc.data();
            worksheet.addRow([
                equipmentSn++,
                equipment.description || '',
                equipment.stock || 0,
                equipment.quantityInStore || 0,
                equipment.labStock || 0,
                equipment.loadOutLocation || '', // Changed from loadOut to loadOutLocation
                equipment.closingBalance || 0,
                equipment.calibrationStatus || '',
                equipment.equipmentStatus || ''
            ]);
        });

        // Add empty row
        worksheet.addRow([]);

        // SECTION E: CONSUMABLES
        const consumableStartRow = worksheet.rowCount + 1;
        worksheet.getCell(`A${consumableStartRow}`).value = 'E';
        worksheet.getCell(`B${consumableStartRow}`).value = 'CONSUMABLES';
        worksheet.mergeCells(`B${consumableStartRow}:D${consumableStartRow}`);

        // Add consumables headers
        const consumableHeaders = ['S/N', 'DESCRIPTION', 'OPENING STOCK', 'QUANTITY IN STORE', 'LAB STOCK', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'EQUIPMENT STATUS', 'REMARKS'];
        worksheet.addRow(consumableHeaders);

        // Get consumable data from Firestore
        const consumableSnapshot = await collections.consumable.orderBy('description').get();
        let consumableSn = 1;

        consumableSnapshot.forEach(doc => {
            const consumable = doc.data();
            worksheet.addRow([
                consumableSn++,
                consumable.description || '',
                consumable.stock || 0,
                consumable.quantityInStore || 0,
                consumable.labStock || 0,
                consumable.loadOutLocation || '', // Changed from loadOut/location to loadOutLocation
                consumable.closingBalance || 0, // Changed from balance to closingBalance
                consumable.status || consumable.equipmentStatus || '',
                consumable.remarks || ''
            ]);
        });

        // Add empty row
        worksheet.addRow([]);

        // SECTION F: GLASSWARES
        const glasswareStartRow = worksheet.rowCount + 1;
        worksheet.getCell(`A${glasswareStartRow}`).value = 'F';
        worksheet.getCell(`B${glasswareStartRow}`).value = 'GLASSWARES';
        worksheet.mergeCells(`B${glasswareStartRow}:D${glasswareStartRow}`);

        // Add glassware headers
        const glasswareHeaders = ['S/N', 'DESCRIPTION', 'OPENING STOCK', 'QUANTITY IN STORE', 'LAB STOCK', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'EQUIPMENT STATUS', 'REMARKS'];
        worksheet.addRow(glasswareHeaders);

        // Get glassware data from Firestore
        const glasswareSnapshot = await collections.glassware.orderBy('description').get();
        let glasswareSn = 1;

        glasswareSnapshot.forEach(doc => {
            const glassware = doc.data();
            worksheet.addRow([
                glasswareSn++,
                glassware.description || '',
                glassware.stock || 0,
                glassware.quantityInStore || 0,
                glassware.labStock || 0,
                glassware.loadOutLocation || '', // Changed from loadOut to loadOutLocation
                glassware.closingBalance || 0, // Changed from closing to closingBalance
                glassware.status || glassware.equipmentStatus || '',
                glassware.remarks || ''
            ]);
        });

        // Add empty rows
        worksheet.addRow([]);
        worksheet.addRow([]);

        // Add remarks
        worksheet.getCell(`B${worksheet.rowCount + 1}`).value = 'Remarks: Some equipment were backloaded from Shafnet SDM.';
        worksheet.mergeCells(`B${worksheet.rowCount}:D${worksheet.rowCount}`);

        // Add calibration status
        worksheet.addRow([]);
        const nextCalibration = new Date();
        nextCalibration.setMonth(nextCalibration.getMonth() + 3); // 3 months from now
        worksheet.getCell(`B${worksheet.rowCount + 1}`).value = `EQUIPMENT CALIBRATION STATUS: Due on ${nextCalibration.getDate()}TH ${monthNames[nextCalibration.getMonth()].toUpperCase()} ${nextCalibration.getFullYear()}`;
        worksheet.mergeCells(`B${worksheet.rowCount}:D${worksheet.rowCount}`);

        // Add empty rows
        // Add empty rows
        worksheet.addRow([]);
        worksheet.addRow([]);

        // Add prepared by (fixed - removed user reference)
        const preparedByName = 'Lab Technician';
        worksheet.getCell(`B${worksheet.rowCount + 1}`).value = `REPORT PREPARED BY : ${preparedByName}`;
        worksheet.mergeCells(`B${worksheet.rowCount}:D${worksheet.rowCount}`);

        // Add approved by
        worksheet.addRow([]);
        worksheet.getCell(`B${worksheet.rowCount + 1}`).value = 'APPROVED BY:';
        worksheet.mergeCells(`B${worksheet.rowCount}:D${worksheet.rowCount}`);

        // Style the worksheet
        worksheet.columns.forEach(column => {
            column.width = 15; // Set default column width
        });

        // Set specific column widths
        worksheet.getColumn(2).width = 30; // Description/Name column
        worksheet.getColumn(3).width = 20; // Vendor/Size column
        worksheet.getColumn(9).width = 25; // Remarks column

        // Generate and download the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `LAB_REPORT_FOR_${monthNames[now.getMonth()].toUpperCase()}_${now.getFullYear()}.xlsx`);

        showMessage('Monthly laboratory report downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showMessage('Error generating laboratory report', 'error');
    }
});

// Excel Import functionality
document.getElementById('importExcelBtn').addEventListener('click', () => {
    document.getElementById('excelFileInput').click();
});

document.getElementById('excelFileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showMessage('Processing Excel file...', 'success');

        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const sheet = workbook.getWorksheet('Sheet1') || workbook.getWorksheet(1);
        if (!sheet) {
            throw new Error('No worksheet found in the Excel file');
        }

        // Process each section
        await processReagents(sheet);
        await processEquipment(sheet);
        await processConsumables(sheet);
        await processGlassware(sheet);

        showMessage('Excel data imported successfully!', 'success');

        // Refresh all inventory views
        inventoryTypes.forEach(type => loadInventoryData(type));

    } catch (error) {
        console.error('Error importing Excel:', error);
        showMessage(`Error importing Excel: ${error.message}`, 'error');
    } finally {
        document.getElementById('excelFileInput').value = '';
    }
});

// Helper function to get cell value
function getCellValue(row, column) {
    const cell = row.getCell(column);
    return cell.value ? cell.value.toString().trim() : '';
}

// Process sections functions
async function processReagents(sheet) {
    const reagents = [];
    let foundSection = false;
    let rowIndex = 0;

    for (rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        if (getCellValue(row, 2) === 'REAGENT INVENTORY') {
            foundSection = true;
            rowIndex++;
            break;
        }
    }

    if (!foundSection) return;

    for (; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        const cellB = getCellValue(row, 2);

        if (cellB === 'EQUIPMENT INVENTORY' || cellB === 'CONSUMABLES' || cellB === 'GLASSWARES') {
            break;
        }

        if (!getCellValue(row, 1) || isNaN(parseInt(getCellValue(row, 1)))) continue;

        const reagent = {
            name: getCellValue(row, 3),
            size: getCellValue(row, 4),
            stock: parseInt(getCellValue(row, 5)) || 0,
            labStock: parseInt(getCellValue(row, 6)) || 0,
            loadOutLocation: getCellValue(row, 7), // Changed from location to loadOutLocation
            closingBalance: parseInt(getCellValue(row, 8)) || 0,
            status: getCellValue(row, 9),
            remarks: getCellValue(row, 10),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };


        if (reagent.name) reagents.push(reagent);
    }

    if (reagents.length > 0) {
        const batch = db.batch();
        for (const reagent of reagents) {
            const docRef = collections.reagent.doc();
            batch.set(docRef, reagent);
        }
        await batch.commit();
    }
}

async function processEquipment(sheet) {
    const equipment = [];
    let foundSection = false;
    let rowIndex = 0;

    for (rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        if (getCellValue(row, 2) === 'EQUIPMENT INVENTORY') {
            foundSection = true;
            rowIndex++;
            break;
        }
    }

    if (!foundSection) return;

    for (; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        const cellB = getCellValue(row, 2);

        if (cellB === 'CONSUMABLES' || cellB === 'GLASSWARES') {
            break;
        }

        if (!getCellValue(row, 1) || isNaN(parseInt(getCellValue(row, 1)))) continue;

        const equipmentItem = {
            description: getCellValue(row, 3),
            stock: parseInt(getCellValue(row, 4)) || 0,
            quantityInStore: parseInt(getCellValue(row, 5)) || 0,
            labStock: parseInt(getCellValue(row, 6)) || 0,
            loadOutLocation: getCellValue(row, 7), // Changed from loadOut to loadOutLocation
            closingBalance: parseInt(getCellValue(row, 8)) || 0,
            calibrationStatus: getCellValue(row, 9),
            equipmentStatus: getCellValue(row, 10),
            remarks: getCellValue(row, 11),
            category: getCellValue(row, 3).toLowerCase().includes('calibration') ? 'calibration' : 'general',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (equipmentItem.description) equipment.push(equipmentItem);
    }

    if (equipment.length > 0) {
        const batch = db.batch();
        for (const item of equipment) {
            const docRef = collections.equipment.doc();
            batch.set(docRef, item);
        }
        await batch.commit();
    }
}
document.getElementById('downloadTemplateBtn').addEventListener('click', async () => {
    try {
        showMessage('Generating Excel template...', 'success');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        // Add headers and sample data for each section
        let currentRow = 1;

        // REAGENT INVENTORY Section
        worksheet.getCell(`B${currentRow}`).value = 'REAGENT INVENTORY';
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 1;

        const reagentHeaders = ['S/N', '', 'Reagent', 'Size', 'Opening Stock', 'Quantity Used (Lab)', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'Status', 'Remarks'];
        reagentHeaders.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow += 1;

        // Sample reagent data
        const sampleReagentData = [
            [1, '', 'Hydrochloric Acid', '1L', 10, 2, 'Lab A', 8, 'OK', 'Good condition'],
            [2, '', 'Sodium Hydroxide', '500ml', 5, 1, 'Lab B', 4, 'Low Stock', 'Need reorder']
        ];

        sampleReagentData.forEach(row => {
            row.forEach((cell, index) => {
                worksheet.getCell(currentRow, index + 1).value = cell;
            });
            currentRow += 1;
        });

        currentRow += 2; // Empty rows

        // EQUIPMENT INVENTORY Section
        worksheet.getCell(`B${currentRow}`).value = 'EQUIPMENT INVENTORY';
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 1;

        const equipmentHeaders = ['S/N', '', 'Description', 'Opening Stock', 'Quantity in Store', 'Lab Stock', 'LOAD OUT (LOCATION)', 'Closing Balance', 'Calibration Status', 'Equipment Status', 'Remarks'];
        equipmentHeaders.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow += 1;

        // Sample equipment data
        const sampleEquipmentData = [
            [1, '', 'Calibration Weight Set', 2, 1, 1, 'Lab C', 2, 'UP TO DATE', 'OK', 'Working fine'],
            [2, '', 'Digital Balance', 3, 2, 1, 'Lab A', 3, 'Due Soon', 'OK', 'Regular maintenance needed']
        ];

        sampleEquipmentData.forEach(row => {
            row.forEach((cell, index) => {
                worksheet.getCell(currentRow, index + 1).value = cell;
            });
            currentRow += 1;
        });

        currentRow += 2; // Empty rows

        // CONSUMABLES Section
        worksheet.getCell(`B${currentRow}`).value = 'CONSUMABLES';
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 1;

        const consumableHeaders = ['S/N', '', 'Description', 'Opening Stock', 'Quantity in Store', 'Lab Stock', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'Equipment Status', 'Remarks'];
        consumableHeaders.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow += 1;

        // Sample consumable data
        const sampleConsumableData = [
            [1, '', 'Test Tubes', 100, 50, 30, 'Storage A', 80, 'OK', 'Good supply'],
            [2, '', 'Pipette Tips', 200, 100, 50, 'Storage B', 150, 'OK', 'Regular stock']
        ];

        sampleConsumableData.forEach(row => {
            row.forEach((cell, index) => {
                worksheet.getCell(currentRow, index + 1).value = cell;
            });
            currentRow += 1;
        });

        currentRow += 2; // Empty rows

        // GLASSWARES Section
        worksheet.getCell(`B${currentRow}`).value = 'GLASSWARES';
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 1;

        const glasswareHeaders = ['S/N', '', 'Description', 'Opening Stock', 'Quantity in Store', 'Lab Stock', 'LOAD OUT (LOCATION)', 'CLOSING BALANCE', 'Equipment Status', 'Remarks'];
        glasswareHeaders.forEach((header, index) => {
            worksheet.getCell(currentRow, index + 1).value = header;
            worksheet.getCell(currentRow, index + 1).font = { bold: true };
        });
        currentRow += 1;

        // Sample glassware data
        const sampleGlasswareData = [
            [1, '', 'Beakers 250ml', 20, 10, 5, 'Lab A', 15, 'OK', 'Clean condition'],
            [2, '', 'Measuring Cylinders 100ml', 15, 8, 4, 'Lab B', 12, 'OK', 'Good condition']
        ];

        sampleGlasswareData.forEach(row => {
            row.forEach((cell, index) => {
                worksheet.getCell(currentRow, index + 1).value = cell;
            });
            currentRow += 1;
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxWidth = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxWidth = Math.max(maxWidth, cellValue.length);
            });
            column.width = Math.min(maxWidth + 2, 50);
        });

        // Generate and download the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'Lab_Inventory_Template.xlsx');

        showMessage('Excel template downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating template:', error);
        showMessage('Error generating Excel template', 'error');
    }
});

async function processConsumables(sheet) {
    const consumables = [];
    let foundSection = false;
    let rowIndex = 0;

    for (rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        if (getCellValue(row, 2) === 'CONSUMABLES') {
            foundSection = true;
            rowIndex++;
            break;
        }
    }

    if (!foundSection) return;

    for (; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        const cellB = getCellValue(row, 2);

        if (cellB === 'GLASSWARES') {
            break;
        }

        if (!getCellValue(row, 1) || isNaN(parseInt(getCellValue(row, 1)))) continue;

        const consumable = {
            description: getCellValue(row, 3),
            stock: parseInt(getCellValue(row, 4)) || 0,
            quantityInStore: parseInt(getCellValue(row, 5)) || 0,
            labStock: parseInt(getCellValue(row, 6)) || 0,
            loadOutLocation: getCellValue(row, 7), // Changed from location to loadOutLocation
            closingBalance: parseInt(getCellValue(row, 8)) || 0, // Changed from balance to closingBalance
            status: getCellValue(row, 9),
            remarks: getCellValue(row, 10),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (consumable.description) consumables.push(consumable);
    }

    if (consumables.length > 0) {
        const batch = db.batch();
        for (const item of consumables) {
            const docRef = collections.consumable.doc();
            batch.set(docRef, item);
        }
        await batch.commit();
    }
}

async function processGlassware(sheet) {
    const glassware = [];
    let foundSection = false;
    let rowIndex = 0;

    for (rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);
        if (getCellValue(row, 2) === 'GLASSWARES') {
            foundSection = true;
            rowIndex++;
            break;
        }
    }

    if (!foundSection) return;

    for (; rowIndex <= sheet.rowCount; rowIndex++) {
        const row = sheet.getRow(rowIndex);

        if (!getCellValue(row, 1) || isNaN(parseInt(getCellValue(row, 1)))) continue;

        const glasswareItem = {
            description: getCellValue(row, 3),
            stock: parseInt(getCellValue(row, 4)) || 0,
            quantityInStore: parseInt(getCellValue(row, 5)) || 0,
            labStock: parseInt(getCellValue(row, 6)) || 0,
            loadOutLocation: getCellValue(row, 7), // Changed from loadOut to loadOutLocation
            closingBalance: parseInt(getCellValue(row, 8)) || 0, // Changed from closing to closingBalance
            status: getCellValue(row, 9),
            remarks: getCellValue(row, 10),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (glasswareItem.description) glassware.push(glasswareItem);
    }

    if (glassware.length > 0) {
        const batch = db.batch();
        for (const item of glassware) {
            const docRef = collections.glassware.doc();
            batch.set(docRef, item);
        }
        await batch.commit();
    }
}

// Setup form handlers for each inventory type
inventoryTypes.forEach(type => {
    setupInventoryType(type);
});

function setupInventoryType(type) {
    const form = document.getElementById(`${type}Form`);
    const action = document.getElementById(`${type}Action`);
    const selectGroup = document.getElementById(`${type}SelectGroup`);
    const existing = document.getElementById(`existing${type.charAt(0).toUpperCase() + type.slice(1)}`);

    if (!form) return;

    // Action change handler
    if (action) {
        action.addEventListener('change', function () {
            handleActionChange(type, this.value);
        });
    }

    // Existing item selection handler
    if (existing) {
        existing.addEventListener('change', function () {
            if (this.value) {
                loadItemForEdit(type, this.value);
            }
        });
    }

    // Equipment category handler
    if (type === 'equipment') {
        const categorySelect = document.getElementById('equipmentCategory');
        const calibrationStatusGroup = document.getElementById('calibrationStatusGroup');
        const equipmentStatusGroup = document.getElementById('equipmentStatusGroup');

        if (categorySelect) {
            categorySelect.addEventListener('change', function () {
                if (this.value === 'calibration') {
                    calibrationStatusGroup.classList.remove('hidden');
                    equipmentStatusGroup.classList.remove('hidden');
                } else if (this.value === 'general') {
                    calibrationStatusGroup.classList.add('hidden');
                    equipmentStatusGroup.classList.remove('hidden');
                    document.getElementById('calibrationStatus').value = '';
                } else {
                    calibrationStatusGroup.classList.add('hidden');
                    equipmentStatusGroup.classList.add('hidden');
                    document.getElementById('calibrationStatus').value = '';
                    document.getElementById('equipmentStatus').value = '';
                }
            });
        }
    }

    // Form submit handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(type);
    });

    // Clear button handler
    const clearBtn = document.getElementById(`clear${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => clearForm(type));
    }

    // Search handlers
    const searchBtn = document.getElementById(`${type}SearchBtn`);
    const searchInput = document.getElementById(`${type}SearchInput`);
    const clearSearchBtn = document.getElementById(`clear${type.charAt(0).toUpperCase() + type.slice(1)}SearchBtn`);

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => filterInventory(type));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filterInventory(type);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            loadInventoryData(type);
        });
    }
}

function handleActionChange(type, action) {
    const selectGroup = document.getElementById(`${type}SelectGroup`);
    const nameField = document.getElementById(type === 'reagent' ? `${type}Name` : `${type}Description`);

    if (action === 'update') {
        selectGroup.classList.remove('hidden');
        nameField.disabled = true;
        populateDropdown(type);
    } else {
        selectGroup.classList.add('hidden');
        nameField.disabled = false;
        clearFormFields(type);
    }
}

function populateDropdown(type) {
    const existing = document.getElementById(`existing${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const nameField = type === 'reagent' ? 'name' : 'description';

    existing.innerHTML = `<option value="">Select ${type}</option>`;

    collections[type].orderBy(nameField).get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data()[nameField];
            existing.appendChild(option);
        });
    }).catch(error => {
        console.error(`Error loading ${type} dropdown:`, error);
        showMessage(`Error loading ${type} list.`, 'error');
    });
}

function loadItemForEdit(type, id) {
    collections[type].doc(id).get().then(doc => {
        if (doc.exists) {
            const item = doc.data();
            populateForm(type, item, doc.id);
        }
    }).catch(error => {
        console.error(`Error loading ${type}:`, error);
        showMessage(`Error loading ${type} data.`, 'error');
    });
}

function populateForm(type, item, id) {
    document.getElementById(`${type}Id`).value = id;

    if (type === 'reagent') {
        document.getElementById('reagentName').value = item.name || '';
        document.getElementById('reagentSize').value = item.size || '';
        document.getElementById('reagentStock').value = item.stock || 0;
        document.getElementById('reagentLabStock').value = item.labStock || 0;
        document.getElementById('reagentLocation').value = item.loadOutLocation || ''; // Changed from location to loadOutLocation
        document.getElementById('reagentClosingBalance').value = item.closingBalance || 0;
        document.getElementById('reagentStatus').value = item.status || 'OK';
        document.getElementById('reagentRemarks').value = item.remarks || '';
    }
    else if (type === 'equipment') {
        document.getElementById('equipmentDescription').value = item.description || '';
        document.getElementById('equipmentStock').value = item.stock || 0;
        document.getElementById('equipmentQuantityInStore').value = item.quantityInStore || 0;
        document.getElementById('equipmentLabStock').value = item.labStock || 0;
        document.getElementById('equipmentLoadOut').value = item.loadOutLocation || ''; // Changed from loadOut to loadOutLocation
        document.getElementById('equipmentClosingBalance').value = item.closingBalance || 0;
        document.getElementById('equipmentCategory').value = item.category || '';
        document.getElementById('equipmentRemarks').value = item.remarks || '';

        const calibrationStatusGroup = document.getElementById('calibrationStatusGroup');
        const equipmentStatusGroup = document.getElementById('equipmentStatusGroup');

        if (item.category === 'calibration') {
            calibrationStatusGroup.classList.remove('hidden');
            equipmentStatusGroup.classList.remove('hidden');
            document.getElementById('calibrationStatus').value = item.calibrationStatus || '';
            document.getElementById('equipmentStatus').value = item.equipmentStatus || '';
        } else if (item.category === 'general') {
            calibrationStatusGroup.classList.add('hidden');
            equipmentStatusGroup.classList.remove('hidden');
            document.getElementById('calibrationStatus').value = '';
            document.getElementById('equipmentStatus').value = item.equipmentStatus || '';
        }
    }
    else if (type === 'consumable') {
        document.getElementById('consumableDescription').value = item.description || '';
        document.getElementById('consumableStock').value = item.stock || 0;
        document.getElementById('consumableQuantityInStore').value = item.quantityInStore || 0;
        document.getElementById('consumableLabStock').value = item.labStock || 0;
        document.getElementById('consumableLocation').value = item.loadOutLocation || ''; // Changed from location to loadOutLocation
        document.getElementById('consumableBalance').value = item.closingBalance || 0; // Changed from balance to closingBalance
        document.getElementById('consumableStatus').value = item.status || '';
        document.getElementById('consumableRemarks').value = item.remarks || '';
    }
    else if (type === 'glassware') {
        document.getElementById('glasswareDescription').value = item.description || '';
        document.getElementById('glasswareStock').value = item.stock || 0;
        document.getElementById('glasswareQuantityInStore').value = item.quantityInStore || 0;
        document.getElementById('glasswareLabStock').value = item.labStock || 0;
        document.getElementById('glasswareLoadOut').value = item.loadOutLocation || ''; // Changed from loadOut to loadOutLocation
        document.getElementById('glasswareClosing').value = item.closingBalance || 0; // Changed from closing to closingBalance
        document.getElementById('glasswareStatus').value = item.status || '';
        document.getElementById('glasswareRemarks').value = item.remarks || '';
    }
}

function clearForm(type) {
    const form = document.getElementById(`${type}Form`);
    const action = document.getElementById(`${type}Action`);
    const currentAction = action.value;

    form.reset();
    action.value = currentAction;
    document.getElementById(`${type}Id`).value = '';

    const nameField = document.getElementById(type === 'reagent' ? `${type}Name` : `${type}Description`);
    const selectGroup = document.getElementById(`${type}SelectGroup`);

    if (currentAction === 'update') {
        selectGroup.classList.remove('hidden');
        nameField.disabled = true;
        document.getElementById(`existing${type.charAt(0).toUpperCase() + type.slice(1)}`).value = '';
    } else if (currentAction === 'add') {
        selectGroup.classList.add('hidden');
        nameField.disabled = false;
    } else {
        selectGroup.classList.add('hidden');
        nameField.disabled = false;
    }

    if (type === 'equipment') {
        const calibrationStatusGroup = document.getElementById('calibrationStatusGroup');
        const equipmentStatusGroup = document.getElementById('equipmentStatusGroup');
        calibrationStatusGroup.classList.add('hidden');
        equipmentStatusGroup.classList.add('hidden');
    }
}

function clearFormFields(type) {
    const nameField = document.getElementById(type === 'reagent' ? `${type}Name` : `${type}Description`);
    nameField.value = '';

    const fields = ['Size', 'Stock', 'LabStock', 'QuantityInStore', 'Location', 'Balance', 'ClosingBalance', 'Closing', 'LoadOut', 'Status', 'Category', 'Remarks'];

    fields.forEach(field => {
        const element = document.getElementById(`${type}${field}`);
        if (element) {
            element.value = field.includes('Stock') || field.includes('Balance') || field === 'Closing' ? '0' : '';
        }
    });

    document.getElementById(`${type}Id`).value = '';
    const existing = document.getElementById(`existing${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (existing) existing.value = '';

    if (type === 'equipment') {
        const calibrationStatusGroup = document.getElementById('calibrationStatusGroup');
        const equipmentStatusGroup = document.getElementById('equipmentStatusGroup');
        calibrationStatusGroup.classList.add('hidden');
        equipmentStatusGroup.classList.add('hidden');
        document.getElementById('calibrationStatus').value = '';
        document.getElementById('equipmentStatus').value = '';
    }
}

function handleFormSubmit(type) {
    const action = document.getElementById(`${type}Action`).value;
    const id = document.getElementById(`${type}Id`).value;
    const nameField = document.getElementById(type === 'reagent' ? `${type}Name` : `${type}Description`);

    if (!nameField.value.trim()) {
        showMessage(`${type === 'reagent' ? 'Reagent name' : 'Description'} is required!`, 'error');
        return;
    }

    const itemData = buildItemData(type);
    const saveBtn = document.getElementById(`save${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);

    saveBtn.disabled = true;
    saveBtn.textContent = action === 'add' ? 'Adding...' : 'Updating...';

    if (action === 'add') {
        collections[type].add(itemData).then(() => {
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
            clearFormFields(type);
            loadInventoryData(type);
        }).catch((error) => {
            console.error(`Error adding ${type}:`, error);
            showMessage(`Error adding ${type}. Please try again.`, 'error');
        }).finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        });
    } else if (action === 'update' && id) {
        collections[type].doc(id).update(itemData).then(() => {
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
            clearFormFields(type);
            loadInventoryData(type);
        }).catch((error) => {
            console.error(`Error updating ${type}:`, error);
            showMessage(`Error updating ${type}. Please try again.`, 'error');
        }).finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        });
    }
}

function buildItemData(type) {
    const itemData = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (type === 'reagent') {
        itemData.name = document.getElementById('reagentName').value.trim();
        itemData.size = document.getElementById('reagentSize').value.trim();
        itemData.stock = parseInt(document.getElementById('reagentStock').value) || 0;
        itemData.labStock = parseInt(document.getElementById('reagentLabStock').value) || 0;
        itemData.loadOutLocation = document.getElementById('reagentLocation').value.trim(); // Changed from location to loadOutLocation
        itemData.closingBalance = parseInt(document.getElementById('reagentClosingBalance').value) || 0;
        itemData.status = document.getElementById('reagentStatus').value.trim();
        itemData.remarks = document.getElementById('reagentRemarks').value.trim();
    }
    else if (type === 'equipment') {
        itemData.description = document.getElementById('equipmentDescription').value.trim();
        itemData.category = document.getElementById('equipmentCategory').value;
        itemData.stock = parseInt(document.getElementById('equipmentStock').value) || 0;
        itemData.quantityInStore = parseInt(document.getElementById('equipmentQuantityInStore').value) || 0;
        itemData.labStock = parseInt(document.getElementById('equipmentLabStock').value) || 0;
        itemData.loadOutLocation = document.getElementById('equipmentLoadOut').value.trim(); // Changed from loadOut to loadOutLocation
        itemData.closingBalance = parseInt(document.getElementById('equipmentClosingBalance').value) || 0;
        itemData.remarks = document.getElementById('equipmentRemarks').value.trim();

        const calibrationStatusInput = document.getElementById('calibrationStatus');
        const equipmentStatusInput = document.getElementById('equipmentStatus');

        if (calibrationStatusInput && calibrationStatusInput.value.trim()) {
            itemData.calibrationStatus = calibrationStatusInput.value.trim();
        }
        if (equipmentStatusInput && equipmentStatusInput.value.trim()) {
            itemData.equipmentStatus = equipmentStatusInput.value.trim();
        }
    }
    else if (type === 'consumable') {
        itemData.description = document.getElementById('consumableDescription').value.trim();
        itemData.stock = parseInt(document.getElementById('consumableStock').value) || 0;
        itemData.quantityInStore = parseInt(document.getElementById('consumableQuantityInStore').value) || 0;
        itemData.labStock = parseInt(document.getElementById('consumableLabStock').value) || 0;
        itemData.loadOutLocation = document.getElementById('consumableLocation').value.trim(); // Changed from location to loadOutLocation
        itemData.closingBalance = parseInt(document.getElementById('consumableBalance').value) || 0; // Changed from balance to closingBalance
        itemData.status = document.getElementById('consumableStatus').value.trim();
        itemData.remarks = document.getElementById('consumableRemarks').value.trim();
    }
    else if (type === 'glassware') {
        itemData.description = document.getElementById('glasswareDescription').value.trim();
        itemData.stock = parseInt(document.getElementById('glasswareStock').value) || 0;
        itemData.quantityInStore = parseInt(document.getElementById('glasswareQuantityInStore').value) || 0;
        itemData.labStock = parseInt(document.getElementById('glasswareLabStock').value) || 0;
        itemData.loadOutLocation = document.getElementById('glasswareLoadOut').value.trim(); // Changed from loadOut to loadOutLocation
        itemData.closingBalance = parseInt(document.getElementById('glasswareClosing').value) || 0; // Changed from closing to closingBalance
        itemData.status = document.getElementById('glasswareStatus').value.trim();
        itemData.remarks = document.getElementById('glasswareRemarks').value.trim();
    }

    return itemData;
}
function loadInventoryData(type) {
    const container = document.getElementById(`${type}InventoryContainer`);
    const tableContainer = document.getElementById(`${type}TableContainer`);
    const tableBody = document.getElementById(`${type}InventoryTableBody`);
    const nameField = type === 'reagent' ? 'name' : 'description';

    container.innerHTML = '<div class="loading">Loading inventory...</div>';
    if (tableContainer) tableContainer.classList.add('hidden');

    collections[type].orderBy(nameField).onSnapshot((querySnapshot) => {
        if (querySnapshot.empty) {
            container.innerHTML = '<div class="loading">No items found.</div>';
            return;
        }

        tableBody.innerHTML = '';
        let sn = 1;

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = buildTableRow(type, item, doc.id, sn++);
            tableBody.appendChild(row);
        });

        container.innerHTML = '';
        if (tableContainer) tableContainer.classList.remove('hidden');

        // Add event listeners for action buttons
        document.querySelectorAll(`.edit-btn[data-type="${type}"]`).forEach(btn => {
            btn.addEventListener('click', () => editItem(btn.dataset.id, type));
        });

        document.querySelectorAll(`.delete-btn[data-type="${type}"]`).forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id, type));
        });

    }, (error) => {
        console.error(`Error loading ${type} inventory:`, error);
        container.innerHTML = '<div class="loading">Error loading inventory. Please refresh the page.</div>';
        showMessage(`Error loading ${type} inventory.`, 'error');
    });
}

function buildTableRow(type, item, id, sn) {
    if (type === 'reagent') {
        return `
                    <td>${sn}</td>
                    <td>${item.name || ''}</td>
                    <td>${item.size || ''}</td>
                    <td>${item.stock || 0}</td>
                    <td>${item.labStock || 0}</td>
                    <td>${item.loadOutLocation || ''}</td> <!-- Changed from location to loadOutLocation -->
                    <td>${item.closingBalance || 0}</td>
                    <td>${renderStatusBadge(item.status)}</td>
                    <td>${item.remarks || ''}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm edit-btn" data-id="${id}" data-type="${type}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${id}" data-type="${type}">Delete</button>
                        </div>
                    </td>
                `;
    }
    else if (type === 'equipment') {
        const categoryDisplay = item.category === 'calibration' ? 'Calibration Equipment' :
            item.category === 'general' ? 'General Equipment' : item.category || '';

        return `
                    <td>${sn}</td>
                    <td>${categoryDisplay}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.stock || 0}</td>
                    <td>${item.quantityInStore || 0}</td>
                    <td>${item.labStock || 0}</td>
                    <td>${item.loadOutLocation || ''}</td> <!-- Changed from loadOut to loadOutLocation -->
                    <td>${item.closingBalance || 0}</td>
                    <td>${renderStatusBadge(item.calibrationStatus)}</td>
                    <td>${renderStatusBadge(item.equipmentStatus)}</td>
                    <td>${item.remarks || ''}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm edit-btn" data-id="${id}" data-type="${type}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${id}" data-type="${type}">Delete</button>
                        </div>
                    </td>
                `;
    }
    else if (type === 'consumable') {
        return `
                    <td>${sn}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.stock || 0}</td>
                    <td>${item.quantityInStore || 0}</td>
                    <td>${item.labStock || 0}</td>
                    <td>${item.loadOutLocation || ''}</td> <!-- Changed from location to loadOutLocation -->
                    <td>${item.closingBalance || 0}</td> <!-- Changed from balance to closingBalance -->
                    <td>${renderStatusBadge(item.status)}</td>
                    <td>${item.remarks || ''}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm edit-btn" data-id="${id}" data-type="${type}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${id}" data-type="${type}">Delete</button>
                        </div>
                    </td>
                `;
    }
    else if (type === 'glassware') {
        return `
                    <td>${sn}</td>
                    <td>${item.description || ''}</td>
                    <td>${item.stock || 0}</td>
                    <td>${item.quantityInStore || 0}</td>
                    <td>${item.labStock || 0}</td>
                    <td>${item.loadOutLocation || ''}</td> <!-- Changed from loadOut to loadOutLocation -->
                    <td>${item.closingBalance || 0}</td> <!-- Changed from closing to closingBalance -->
                    <td>${renderStatusBadge(item.status)}</td>
                    <td>${item.remarks || ''}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm edit-btn" data-id="${id}" data-type="${type}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${id}" data-type="${type}">Delete</button>
                        </div>
                    </td>
                `;
    }
}

function editItem(id, type) {
    const action = document.getElementById(`${type}Action`);
    action.value = 'update';
    handleActionChange(type, 'update');

    setTimeout(() => {
        const existing = document.getElementById(`existing${type.charAt(0).toUpperCase() + type.slice(1)}`);
        existing.value = id;
        loadItemForEdit(type, id);
    }, 500);

    document.querySelector(`#${type}s-tab .card`).scrollIntoView({
        behavior: 'smooth'
    });

    const tabButton = document.querySelector(`.tab[data-tab="${type}s"]`);
    if (tabButton && !tabButton.classList.contains('active')) {
        tabButton.click();
    }
}

function deleteItem(id, type) {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
        return;
    }

    collections[type].doc(id).delete().then(() => {
        showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
    }).catch((error) => {
        console.error(`Error deleting ${type}:`, error);
        showMessage(`Error deleting ${type}. Please try again.`, 'error');
    });
}

function filterInventory(type) {
    const searchInput = document.getElementById(`${type}SearchInput`);
    const tableBody = document.getElementById(`${type}InventoryTableBody`);
    const searchTerm = searchInput.value.trim().toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        const fieldValue = cells[1].textContent.toLowerCase(); // Name/Description column

        if (fieldValue.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// Initialize the application
function init() {
    try {
        // Load all inventory data with real-time listeners
        inventoryTypes.forEach(type => {
            loadInventoryData(type);
        });

        showMessage('Laboratory Inventory System loaded successfully!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('Error initializing application. Please refresh the page.', 'error');
    }
}

// Start the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Handle potential Firebase connection issues
window.addEventListener('online', () => {
    showMessage('Connection restored. Data will sync automatically.');
});

window.addEventListener('offline', () => {
    showMessage('You are offline. Changes will sync when connection is restored.', 'error');
});