Write-Host "========================================"
Write-Host " RUNNING TESTS FOR MODULE 1: STUDY ROOM"
Write-Host "========================================"

# Run Pytest for Backend
Write-Host "`n---> Running Backend Unit/Integration Tests (Pytest)..."
cd D:\DK_My_Code\Code_Web\Ketib-schedule\backend
# Assuming pytest is installed in the environment
pytest ../testing/backend/test_module_1_study_room.py -v
$backend_exit_code = $LASTEXITCODE

# Run Cypress for System
Write-Host "`n---> Running System/E2E Tests (Cypress)..."
cd D:\DK_My_Code\Code_Web\Ketib-schedule\frontend
npx cypress run --spec "../testing/system/module_1_study_room.cy.js"
$cypress_exit_code = $LASTEXITCODE

Write-Host "`n========================================"
if ($backend_exit_code -eq 0 -and $cypress_exit_code -eq 0) {
    Write-Host "MODULE 1 TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS IN MODULE 1 FAILED. CHECK LOGS ABOVE." -ForegroundColor Red
}
Write-Host "========================================"

# Return to original dir
cd D:\DK_My_Code\Code_Web\Ketib-schedule
