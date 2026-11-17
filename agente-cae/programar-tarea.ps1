# Crea (o actualiza) la tarea programada "INER Agente CAE semanal": miercoles a las 23:00.
# Si el PC estaba apagado a esa hora, se ejecuta en cuanto se encienda (StartWhenAvailable).
# Se ejecuta con tu usuario (necesita tu sesion de Claude Code) y solo cuando has iniciado sesion en Windows.
$bat = Join-Path $PSScriptRoot 'ejecutar-semanal.bat'
$accion = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$bat`""
$disparador = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At '23:00'
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName 'INER Agente CAE semanal' -Action $accion -Trigger $disparador -Settings $ajustes -Force | Out-Null
Write-Host 'Tarea creada: miercoles 23:00. Para probarla ahora: ejecuta ejecutar-semanal.bat'
