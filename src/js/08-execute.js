/**
 * Showroom Execute Functionality
 * Adds execute buttons to code blocks with role="execute"
 * Similar to Homeroom/Bookbag functionality
 */

(function () {
  'use strict'

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  function init () {
    console.log('Showroom Execute: Initializing...')
    console.log('Showroom Execute: DOM ready state:', document.readyState)

    // Find all code blocks with execute class
    // Antora renders role="execute" as <div class="listingblock execute">
    const executeBlocks = document.querySelectorAll('div.listingblock.execute')

    console.log(`Showroom Execute: Found ${executeBlocks.length} execute blocks`)

    if (executeBlocks.length === 0) {
      console.warn('Showroom Execute: No execute blocks found! Checking for alternative selectors...')
      const allListingBlocks = document.querySelectorAll('div.listingblock')
      console.log(`Showroom Execute: Total listingblock divs: ${allListingBlocks.length}`)
      allListingBlocks.forEach(function (block, index) {
        if (index < 5) {
          console.log(`Showroom Execute: Block ${index} classes:`, block.className)
        }
      })
    }

    executeBlocks.forEach(function (block, index) {
      console.log(`Showroom Execute: Processing block ${index}`)
      addExecuteButton(block)
    })
  }

  function addExecuteButton (block) {
    console.log('Showroom Execute: Making block clickable')

    // Find the code element - it's nested: div.content > pre > code
    const codeElement = block.querySelector('code')
    if (!codeElement) {
      console.warn('Showroom Execute: No code element found in block')
      return
    }

    const command = codeElement.textContent.trim()
    console.log('Showroom Execute: Command:', command.substring(0, 50) + '...')

    // Get the content div
    const contentDiv = block.querySelector('.content')
    if (!contentDiv) {
      console.warn('Showroom Execute: No content div found')
      return
    }

    // Hide any existing copy buttons
    const copyButtons = block.querySelectorAll('.copy-button, button[title*="Copy"], .toolbar button')
    copyButtons.forEach(function (btn) {
      btn.style.display = 'none'
    })

    // Also hide toolbar if it exists
    const toolbar = block.querySelector('.toolbar')
    if (toolbar) {
      toolbar.style.display = 'none'
    }

    // Style the entire block to be clickable with warm color
    block.style.cssText = `
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 4px;
      position: relative;
    `

    // Add warm peachy/coral background color
    contentDiv.style.cssText = `
      background: #ffe8dc;
      border-left: 4px solid #ff9966;
      transition: all 0.2s ease;
      position: relative;
    `

    // Add click indicator icon in top-right
    const indicator = document.createElement('div')
    indicator.innerHTML = '▶'
    indicator.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      color: #cc6633;
      font-size: 14px;
      opacity: 0.7;
      pointer-events: none;
    `
    contentDiv.appendChild(indicator)

    // Hover effect
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
      console.log('Showroom Execute: Block clicked!')

      // Switch to Terminal tab before executing
      switchToTerminalTab()

      // Small delay to let the terminal tab activate, then execute
      setTimeout(function () {
        executeCommand(command)
      }, 300)

      // Visual feedback
      contentDiv.style.background = '#d4edda'
      contentDiv.style.borderLeftColor = '#28a745'
      indicator.innerHTML = '✓'
      indicator.style.color = '#28a745'

      setTimeout(function () {
        contentDiv.style.background = '#ffe8dc'
        contentDiv.style.borderLeftColor = '#ff9966'
        indicator.innerHTML = '▶'
        indicator.style.color = '#cc6633'
      }, 1000)
    })

    console.log('Showroom Execute: Block made clickable successfully')
  }

  function switchToTerminalTab () {
    if (window.parent !== window) {
      try {
        var parentDoc = window.parent.document

        // Find the PF6 tab button by its item-text content
        var tabTexts = parentDoc.querySelectorAll('.pf-v6-c-tabs__item-text')
        for (var i = 0; i < tabTexts.length; i++) {
          var text = tabTexts[i].textContent.trim()
          if (text === 'Terminal' || text === 'Bastion') {
            // Click the parent link element, not the span
            var tabLink = tabTexts[i].closest('.pf-v6-c-tabs__link') || tabTexts[i].parentElement
            if (tabLink) {
              console.log('Showroom Execute: Clicking Terminal tab button')
              tabLink.click()
              return
            }
          }
        }
        console.log('Showroom Execute: Terminal tab not found in PF6 tabs')
      } catch (e) {
        console.log('Showroom Execute: Cannot switch tab:', e)
      }
    }
  }

  function executeCommand (command) {
    console.log('Showroom Execute: Running command:', command)

    // Try to find the terminal iframe
    let terminalFrame = null

    if (window.parent !== window) {
      try {
        const parentDoc = window.parent.document
        terminalFrame = parentDoc.querySelector('iframe[src*="/wetty"]') ||
                       parentDoc.querySelector('iframe[src*="/terminal"]') ||
                       parentDoc.querySelector('iframe[src*="/tty"]') ||
                       parentDoc.querySelector('.app-split-right__content.active iframe') ||
                       parentDoc.querySelector('iframe#terminal_01')

        if (!terminalFrame) {
          const allIframes = parentDoc.querySelectorAll('.app-split-right__content iframe')
          for (let i = 0; i < allIframes.length; i++) {
            const src = allIframes[i].src || ''
            if (src.includes('/wetty') || src.includes('/terminal') || src.includes('/tty')) {
              terminalFrame = allIframes[i]
              break
            }
          }
        }
      } catch (e) {
        console.error('Cannot access parent document:', e)
      }
    }

    if (terminalFrame && terminalFrame.contentWindow) {
      console.log('Showroom Execute: Terminal iframe found:', terminalFrame.src)

      try {
        var wettyDoc = terminalFrame.contentDocument || terminalFrame.contentWindow.document
        var textarea = wettyDoc.querySelector('.xterm-helper-textarea')

        if (textarea) {
          console.log('Showroom Execute: Found xterm textarea, sending input')
          textarea.focus()

          // xterm processes text via the 'data' event on the textarea's input
          // Use InputEvent to inject text directly
          textarea.value = ''
          textarea.dispatchEvent(new wettyDoc.defaultView.InputEvent('beforeinput', {
            data: command,
            inputType: 'insertText',
            bubbles: true,
            cancelable: true,
          }))
          textarea.value = command
          textarea.dispatchEvent(new wettyDoc.defaultView.Event('input', {
            bubbles: true,
          }))
          // Send Enter
          textarea.value = ''
          textarea.dispatchEvent(new wettyDoc.defaultView.InputEvent('beforeinput', {
            data: '\r',
            inputType: 'insertText',
            bubbles: true,
            cancelable: true,
          }))
          textarea.value = '\r'
          textarea.dispatchEvent(new wettyDoc.defaultView.Event('input', {
            bubbles: true,
          }))
          console.log('Showroom Execute: Command sent via keyboard events')
        } else {
          console.error('Showroom Execute: xterm textarea not found')
        }
      } catch (e) {
        console.error('Showroom Execute: Error accessing terminal:', e)
      }
    } else {
      console.error('Showroom Execute: Terminal iframe not found')
      console.error('Terminal not found. Please ensure the terminal tab is loaded.')
    }
  }
})()
