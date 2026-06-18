# ============================================================
# Script de génération automatique du rapport mensuel
# Fréquence : 1er de chaque mois à 8h00
#
# Configuration Windows Task Scheduler :
# 1. Déclencheur : Mensuel, le 1er jour du mois, à 08:00
# 2. Action: powershell.exe -NonInteractive -File "C:\Users\Utilisateur\OneDrive\Bureau\CRM SDA Rénovation\scripts\rapport-mensuel-auto.ps1"
# ============================================================

$CRMRoot = "C:\Users\Utilisateur\OneDrive\Bureau\CRM SDA Rénovation"
$LogFile = Join-Path $CRMRoot "backups\rapport.log"
$ApiUrl  = "http://localhost:3000/api/rapport-mensuel"

try {
    # Déclencher la génération du rapport via l'API CRM
    $Response = Invoke-RestMethod -Uri $ApiUrl -Method POST -ContentType "application/json" -Body '{"secret":"crm-sda-renovation"}' -TimeoutSec 60
    $Message = "[OK] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') — Rapport mensuel généré : $($Response | ConvertTo-Json -Compress)"
    Add-Content -Path $LogFile -Value $Message
    Write-Host $Message
} catch {
    $ErrMsg = "[ERREUR] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') — $($_.Exception.Message)"
    Add-Content -Path $LogFile -Value $ErrMsg
    Write-Host $ErrMsg
    exit 1
}
