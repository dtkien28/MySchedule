Write-Host "==============================================="
Write-Host " RUNNING TESTS FOR MODULE 3: SETTINGS"
Write-Host "==============================================="

# Run Pytest for Backend
Write-Host "`n---> Running Backend Unit/Integration Tests (Pytest)..."
cd D:\DK_My_Code\Code_Web\Ketib-schedule\backend
pytest ../testing/backend/test_module_3_settings.py -v
$backend_exit_code = $LASTEXITCODE

# Run Cypress for System
Write-Host "`n---> Running System/E2E Tests (Cypress)..."
cd D:\DK_My_Code\Code_Web\Ketib-schedule\frontend
npx cypress run --spec "../testing/system/module_3_settings.cy.js"
$cypress_exit_code = $LASTEXITCODE

Write-Host "`n==============================================="
if ($backend_exit_code -eq 0 -and $cypress_exit_code -eq 0) {
    Write-Host "MODULE 3 TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS IN MODULE 3 FAILED. CHECK LOGS ABOVE." -ForegroundColor Red
}
Write-Host "==============================================="

# Return to original dir
cd D:\DK_My_Code\Code_Web\Ketib-schedule
