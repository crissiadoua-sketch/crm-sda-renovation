# ============================================================
# Script de sauvegarde automatique — CRM SDA Rénovation
# Fréquence recommandée : toutes les 30 minutes
#
# Configuration Windows Task Scheduler :
# 1. Ouvrir "Planificateur de tâches"
# 2. Créer une tâche de base → Nom: "CRM SDA Backup 30min"
# 3. Déclencheur: Journalier, répéter toutes les 30 minutes
# 4. Action: powershell.exe -NonInteractive -File "C:\Users\Utilisateur\OneDrive\Bureau\CRM SDA Rénovation\scripts\backup-crm.ps1"
# 5. Cocher "Exécuter même si l'utilisateur n'est pas connecté" si souhaité
# ============================================================

$CRMRoot   = "C:\Users\Utilisateur\OneDrive\Bureau\CRM SDA Rénovation"
$DbSource  = Join-Path $CRMRoot "prisma\dev.db"
$BackupDir = Join-Path $CRMRoot "backups"
$LogFile   = Join-Path $CRMRoot "backups\backup.log"

# Créer le dossier de sauvegardes si nécessaire
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$DateStr   = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupFile = Join-Path $BackupDir "crm_backup_$DateStr.db"

try {
    # Vérifier que la base de données existe
    if (-not (Test-Path $DbSource)) {
        throw "Base de données introuvable : $DbSource"
    }

    # Copier la DB
    Copy-Item -Path $DbSource -Destination $BackupFile -Force
    $TailleKo = [math]::Round((Get-Item $BackupFile).Length / 1024, 1)

    # Nettoyer : garder les 48 dernières sauvegardes (24h × 2/h = 48)
    $Fichiers = Get-ChildItem -Path $BackupDir -Filter "crm_backup_*.db" | Sort-Object Name
    if ($Fichiers.Count -gt 48) {
        $ASupprimer = $Fichiers | Select-Object -First ($Fichiers.Count - 48)
        foreach ($F in $ASupprimer) {
            Remove-Item $F.FullName -Force
        }
    }

    $Message = "[OK] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') — Sauvegarde : crm_backup_$DateStr.db ($TailleKo Ko)"
    Add-Content -Path $LogFile -Value $Message
    Write-Host $Message

} catch {
    $ErrMsg = "[ERREUR] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') — $($_.Exception.Message)"
    Add-Content -Path $LogFile -Value $ErrMsg
    Write-Host $ErrMsg
    exit 1
}
