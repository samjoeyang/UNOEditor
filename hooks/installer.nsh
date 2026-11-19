; Register the unoeditor:// deep-link scheme on Windows (NSIS installer).
; The deep-link plugin does not write registry keys by itself on Windows,
; so the installer must register the protocol handler.
!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Registering unoeditor:// protocol handler"
  WriteRegStr SHCTX "Software\Classes\unoeditor" "" "URL:unoeditor"
  WriteRegStr SHCTX "Software\Classes\unoeditor" "URL Protocol" ""
  WriteRegStr SHCTX "Software\Classes\unoeditor\DefaultIcon" "" "$INSTDIR\UNOEditor.exe,0"
  WriteRegStr SHCTX "Software\Classes\unoeditor\shell\open\command" "" '"$INSTDIR\UNOEditor.exe" "%1"'
!macroend
