import { ReactiveComponent, mount } from '@geastack/core'
import { GeaWebView } from '@geastack-community/webview'
import './styles.css'

// A solid red page, shown over the whole window.
const RED_PAGE = 'data:text/html,<body style="margin:0;background:red"></body>'

export class App extends ReactiveComponent {
  onAfterRender() {
    // 0: the app's own window.
    const webview = new GeaWebView(0)
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
