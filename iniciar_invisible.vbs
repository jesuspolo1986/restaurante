' =================================================================
'   GastroLocal / ElenaPRO - Lanzador Invisible para Windows
' =================================================================
'   Este script inicia GastroLocal de forma invisible 
'   (ocultando la ventana negra de la consola CMD) para evitar que
'   se cierre por error accidental durante el servicio.
' =================================================================

Dim WshShell, fso, scriptPath, exePath, batPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtiene dinámicamente la ruta de la carpeta donde se encuentra este archivo VBS
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = scriptPath & "\GastroLocal.exe"
batPath = scriptPath & "\iniciar_sistema.bat"

' 1. Si existe GastroLocal.exe en la misma carpeta, ejecutarlo directamente
If fso.FileExists(exePath) Then
    WshShell.Run Chr(34) & exePath & Chr(34), 0, False
' 2. Si no, intentar con iniciar_sistema.bat
ElseIf fso.FileExists(batPath) Then
    WshShell.Run Chr(34) & batPath & Chr(34), 0, False
Else
    MsgBox "No se encontró 'GastroLocal.exe' ni 'iniciar_sistema.bat' en:" & vbCrLf & scriptPath, vbCritical, "Error al iniciar GastroLocal"
End If

' Liberar memoria
Set WshShell = Nothing
Set fso = Nothing
