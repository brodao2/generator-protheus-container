# Rodar no PowerShell como  Admin

Stop-Service -Name "MSSQLSERVER" -Force
Stop-Service -Name "SQLBrowser" -Force
Stop-Service -Name "SQLTELEMETRY" -Force
Stop-Service -Name "SQLWriter" -Force
Stop-Service -Name "DBACCESS" -Force
