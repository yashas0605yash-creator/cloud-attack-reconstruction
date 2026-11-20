$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

foreach ($cmd in @("node", "npm", "mysql")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "$cmd was not found. Install Node.js or MySQL Server and ensure it is in PATH."
  }
}

Write-Host "Enter MySQL administrator username (usually root):"
$DbAdmin = Read-Host
$SecureRoot = Read-Host "Enter MySQL administrator password" -AsSecureString
$RootPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureRoot)
$RootPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($RootPtr)

$AppPassword = Read-Host "Create a password for the application database user (minimum 16 characters)" -AsSecureString
$AppPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AppPassword)
$AppPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($AppPtr)
if ($AppPlain.Length -lt 16) { throw "Application password must be at least 16 characters." }

$randomBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($randomBytes)
$SessionSecret = [Convert]::ToBase64String($randomBytes)
$rng.Dispose()
$EscapedApp = $AppPlain.Replace("\", "\\").Replace("'", "\'")
$Sql = @"
CREATE DATABASE IF NOT EXISTS cloud_attack_db CHARACTER SET utf8mb4;CREATE USER IF NOT EXISTS 'car_app'@'localhost' IDENTIFIED BY '$EscapedApp';
ALTER USER 'car_app'@'localhost' IDENTIFIED BY '$EscapedApp';
GRANT SELECT, INSERT, UPDATE, DELETE ON cloud_attack_db.* TO 'car_app'@'localhost';

CREATE ROLE IF NOT EXISTS 'car_analyst_role';
CREATE ROLE IF NOT EXISTS 'car_admin_role';

GRANT SELECT ON cloud_attack_db.* TO 'car_analyst_role';

GRANT ALL PRIVILEGES ON cloud_attack_db.* TO 'car_admin_role';

CREATE USER IF NOT EXISTS 'car_analyst_demo'@'localhost' IDENTIFIED BY 'ChangeThisDemoPassword_123!';
CREATE USER IF NOT EXISTS 'car_admin_demo'@'localhost' IDENTIFIED BY 'ChangeThisAdminPassword_123!';
GRANT 'car_analyst_role' TO 'car_analyst_demo'@'localhost';
GRANT 'car_admin_role' TO 'car_admin_demo'@'localhost';
SET DEFAULT ROLE 'car_analyst_role' TO 'car_analyst_demo'@'localhost';
SET DEFAULT ROLE 'car_admin_role' TO 'car_admin_demo'@'localhost';
"@

$TempSql = Join-Path $env:TEMP "car_setup.sql"
[IO.File]::WriteAllText($TempSql, $Sql, [Text.UTF8Encoding]::new($false))

try {
  $env:MYSQL_PWD = $RootPassword
  cmd.exe /c "mysql -u `"$DbAdmin`" < `"$TempSql`""
  if ($LASTEXITCODE -ne 0) { throw "Could not create MySQL database and roles." }
  cmd.exe /c "mysql -u `"$DbAdmin`" cloud_attack_db < `"$Root\database\schema.sql`""
  $Sql = @"
GRANT SELECT, INSERT, UPDATE ON cloud_attack_db.audit_events TO 'car_analyst_role';
GRANT SELECT, INSERT, UPDATE ON cloud_attack_db.incidents TO 'car_analyst_role';
GRANT SELECT, INSERT ON cloud_attack_db.investigation_notes TO 'car_analyst_role';
"@

[IO.File]::WriteAllText($TempSql, $Sql, [Text.UTF8Encoding]::new($false))

cmd.exe /c "mysql -u `"$DbAdmin`" < `"$TempSql`""

if ($LASTEXITCODE -ne 0) {
    throw "Could not assign analyst table permissions."
}
  if ($LASTEXITCODE -ne 0) { throw "Could not create database tables." }
}
finally {
  Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
  Remove-Item $TempSql -Force -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($RootPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($AppPtr)
}

$EnvText = @"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cloud_attack_db
DB_USER=car_app
DB_PASSWORD=$AppPlain
SESSION_SECRET=$SessionSecret
PORT=3000
"@
[IO.File]::WriteAllText((Join-Path $Root ".env"), $EnvText, [Text.UTF8Encoding]::new($false))

Write-Host "Installing Node.js dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Write-Host ""
Write-Host "Setup complete."
Write-Host "Next: run .\scripts\create-admin.ps1 and then .\scripts\start.ps1"