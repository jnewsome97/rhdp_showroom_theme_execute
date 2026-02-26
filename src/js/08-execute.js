/**
 * Showroom Execute Functionality
 * Adds execute buttons to code blocks with role="execute"
 * Sends commands to wetty terminal via socket.emit("input")
 */

;(function () {
  'use strict'

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  function init () {
    // Find all code blocks with execute class
    // Antora renders role="execute" as <div class="listingblock execute">
    var executeBlocks = document.querySelectorAll('div.listingblock.execute')

    if (executeBlocks.length === 0) return

    executeBlocks.forEach(function (block) {
      addExecuteButton(block)
    })
  }

  function addExecuteButton (block) {
    // Find the code element - it's nested: div.content > pre > code
    var codeElement = block.querySelector('code')
    if (!codeElement) return

    var command = codeElement.textContent.trim()

    // Get the content div
    var contentDiv = block.querySelector('.content')
    if (!contentDiv) return

    // Hide any existing copy buttons / toolbar
    block.querySelectorAll('.copy-button, button[title*="Copy"], .toolbar button').forEach(function (btn) {
      btn.style.display = 'none'
    })
    var toolbar = block.querySelector('.toolbar')
    if (toolbar) toolbar.style.display = 'none'

    // Style the entire block to be clickable with warm color
    block.style.cssText =
      'cursor: pointer; transition: all 0.2s ease; border-radius: 4px; position: relative;'

    contentDiv.style.cssText =
      'background: #ffe8dc; border-left: 4px solid #ff9966; transition: all 0.2s ease; position: relative;'

    // Add play indicator icon in top-right
    var indicator = document.createElement('div')
    indicator.innerHTML = '&#9654;'
    indicator.style.cssText =
      'position: absolute; top: 8px; right: 8px; color: #cc6633; font-size: 14px; opacity: 0.7; pointer-events: none;'
    contentDiv.appendChild(indicator)

    // Hover effects
    block.addEventListener('mouseenter', function () {
      contentDiv.style.background = '#ffd4c0'
      contentDiv.style.borderLeftColor = '#ff7733'
      indicator.style.opacity = '1'
      indicator.style.color = '#ff7733'
    })

    block.addEventListener('mouseleave', function () {
      contentDiv.style.background = '#ffe8dc'
      contentDiv.style.borderLeftColor = '#ff9966'
      indicator.style.opacity = '0.7'
      indicator.style.color = '#cc6633'
    })

    // Click handler
    block.addEventListener('click', function (e) {
      e.preventDefault()
      switchToTerminalTab()

      setTimeout(function () {
        executeCommand(command)
      }, 300)

      // Visual feedback - green flash
      contentDiv.style.background = '#d4edda'
      contentDiv.style.borderLeftColor = '#28a745'
      indicator.innerHTML = '&#10003;'
      indicator.style.color = '#28a745'

      setTimeout(function () {
        contentDiv.style.background = '#ffe8dc'
        contentDiv.style.borderLeftColor = '#ff9966'
        indicator.innerHTML = '&#9654;'
        indicator.style.color = '#cc6633'
      }, 1000)
    })
  }

  /**
   * Switch the showroom UI to the Terminal tab if not already active.
   * The showroom SPA uses PatternFly v6 tabs.
   */
  function switchToTerminalTab () {
    if (window.parent === window) return
    try {
      var tabTexts = window.parent.document.querySelectorAll('.pf-v6-c-tabs__item-text')
      for (var i = 0; i < tabTexts.length; i++) {
        var text = tabTexts[i].textContent.trim()
        if (text === 'Terminal' || text === 'Bastion') {
          var link = tabTexts[i].closest('.pf-v6-c-tabs__link') || tabTexts[i].parentElement
          if (link) link.click()
          return
        }
      }
    } catch (e) {
      // cross-origin or other access error - ignore
    }
  }

  /**
   * Find the wetty terminal iframe in the parent showroom SPA and
   * send a command to the shell via wetty_term.socket.emit("input").
   *
   * Wetty sets window.wetty_term on its iframe window. The Term class
   * extends xterm Terminal and has a .socket property (socket.io client).
   * Input is sent via socket.emit("input", data) which goes to the SSH session.
   */
  function executeCommand (command) {
    var terminalFrame = findTerminalIframe()

    if (!terminalFrame || !terminalFrame.contentWindow) {
      console.error('Showroom Execute: Terminal iframe not found')
      return
    }

    try {
      var wettyTerm = terminalFrame.contentWindow.wetty_term

      if (wettyTerm && wettyTerm.socket) {
        // Send command + carriage return directly to the SSH session via socket
        wettyTerm.socket.emit('input', command + '\r')
        return
      }

      // Fallback: try using xterm's internal data event which triggers onData -> socket.emit
      if (wettyTerm && wettyTerm._core) {
        var core = wettyTerm._core
        if (core.coreService && typeof core.coreService.triggerDataEvent === 'function') {
          core.coreService.triggerDataEvent(command + '\r')
          return
        }
      }

      console.error('Showroom Execute: wetty_term or socket not found in terminal iframe')
    } catch (e) {
      console.error('Showroom Execute: Error sending command:', e)
    }
  }

  /**
   * Locate the wetty/terminal iframe inside the showroom SPA parent document.
   */
  function findTerminalIframe () {
    if (window.parent === window) return null

    try {
      var parentDoc = window.parent.document

      // Try direct selectors for known wetty/terminal iframe patterns
      var frame = parentDoc.querySelector('iframe[src*="/wetty"]') ||
                  parentDoc.querySelector('iframe[src*="/terminal"]') ||
                  parentDoc.querySelector('iframe[src*="/tty"]')
      if (frame) return frame

      // Try the active right-panel content iframe
      frame = parentDoc.querySelector('.app-split-right__content.active iframe')
      if (frame) return frame

      // Search all right-panel iframes for one pointing at wetty
      var iframes = parentDoc.querySelectorAll('.app-split-right__content iframe')
      for (var i = 0; i < iframes.length; i++) {
        var src = iframes[i].src || ''
        if (src.indexOf('/wetty') !== -1 || src.indexOf('/terminal') !== -1 || src.indexOf('/tty') !== -1) {
          return iframes[i]
        }
      }
    } catch (e) {
      // cross-origin error
    }

    return null
  }
})()
