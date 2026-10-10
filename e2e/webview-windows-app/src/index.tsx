import { ReactiveComponent, mount } from '@geastack/core'
import { mainWindowHandle } from '@geastack/windows/Controls'
import { GeaWebView } from '@geastack-community/webview'
import './styles.css'

// A solid red page: scripts/verify.ps1 looks for it in the window's pixels.
const RED_PAGE = 'data:text/html,<body style="margin:0;background:red"></body>'

export class App extends ReactiveComponent {
  onAfterRender() {
    // The handle table keeps the control alive; nothing needs to hold it here.
    const webview = new GeaWebView(mainWindowHandle())
    webview.navigate(RED_PAGE)
  }

  template() {
    return (
      <div class="app">
        <div class="panel">
          <span class="eyebrow">GEASTACK</span>
          <span class="title">WebView E2E</span>
          <span class="copy">If the page behind this text is red, GeaWebView works.</span>
        </div>
      </div>
    )
  }
}

mount(App)
