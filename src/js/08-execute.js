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
      executeCommand(command)

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

  function executeCommand (command) {
    console.log('Showroom Execute: Running command:', command)

    // Try to find the terminal iframe
    // The terminal is in the parent window at /terminal
    let terminalFrame = null

    if (window.parent !== window) {
      // We're in an iframe (the content iframe)
      // Try to find sibling terminal iframe
      try {
        const parentDoc = window.parent.document
        terminalFrame = parentDoc.querySelector('iframe[src*="/terminal"]') ||
                       parentDoc.querySelector('iframe#terminal_01')
      } catch (e) {
        console.error('Cannot access parent document:', e)
      }
    }

    if (terminalFrame && terminalFrame.contentWindow) {
      console.log('Showroom Execute: Terminal iframe found, sending command')

      try {
        const term = terminalFrame.contentWindow.term

        if (term) {
          console.log('Showroom Execute: Terminal object found')

          // Method 1: Try sendText if available (some terminals have this)
          if (typeof term.sendText === 'function') {
            console.log('Showroom Execute: Using term.sendText()')
            term.sendText(command + '\n', true)
          } else if (typeof term.paste === 'function') {
            // Method 2: Paste the command, then simulate Enter key
            console.log('Showroom Execute: Using term.paste() + simulated Enter')
            term.paste(command)
            // Wait a tiny bit for paste to complete, then send Enter
            setTimeout(function () {
              // Send Enter key - xterm uses '\r' for carriage return
              if (typeof term.write === 'function') {
                term.write('\r')
              }
              // Also try sending to the underlying shell if available
              if (term._core && term._core.coreService && term._core.coreService.triggerDataEvent) {
                term._core.coreService.triggerDataEvent('\r')
              }
            }, 10)
          } else if (typeof term.write === 'function') {
            // Method 3: Write command and Enter together
            console.log('Showroom Execute: Using term.write() with newline')
            term.write(command + '\r')
          }

          console.log('Showroom Execute: Command sent to terminal')
        } else {
          console.error('Showroom Execute: Terminal object not found in iframe')
        }
      } catch (e) {
        console.error('Showroom Execute: Error sending to terminal:', e)
      }

      // Also try postMessage as fallback
      try {
        terminalFrame.contentWindow.postMessage({
          type: 'execute',
          command: command + '\n',
        }, '*')
        console.log('Showroom Execute: Command also sent via postMessage')
      } catch (e) {
        console.log('Showroom Execute: postMessage failed:', e)
      }
    } else {
      console.error('Showroom Execute: Terminal iframe not found')
      console.error('Terminal not found. Please ensure the terminal tab is loaded.')
    }
  }
})()
