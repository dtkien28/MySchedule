Write-Host "==============================================="
Write-Host " RUNNING TESTS FOR MODULE 4: PERFORMANCE (LOCUST)"
Write-Host "==============================================="

# Run Locust for Performance
Write-Host "`n---> Starting Locust Performance Tests..."
Write-Host "Vui lòng mở trình duyệt tại địa chỉ http://localhost:8089 để thiết lập thông số Load Test (Số lượng Users, Tốc độ Ramp-up)."
cd D:\DK_My_Code\Code_Web\Ketib-schedule\testing\performance
locust -f locustfile_module_4.py

# Return to original dir
cd D:\DK_My_Code\Code_Web\Ketib-schedule
