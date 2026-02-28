document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const quickPrompts = document.querySelectorAll('.chip');

    // UI Elements for Wallet
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
    const userAddressDisplay = document.getElementById('user-address');
    const userNameDisplay = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const totalBalanceAmount = document.getElementById('total-balance-amount');
    const networkBadge = document.getElementById('network-badge');
    const balanceChangeLabel = document.getElementById('balance-change-label');

    // Web3 State
    let provider = null;
    let signer = null;
    let userAddress = null;
    let pendingTx = null;
    const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

    // Initialize Ethers Provider if MetaMask is available
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        // Handle account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                handleSuccessfulConnection(accounts[0]);
            } else {
                handleDisconnect();
            }
        });

        // Handle chain changes
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }

    // Connect Wallet Function
    async function connectWallet() {
        if (!window.ethereum) {
            alert("MetaMask no está instalado. Por favor, instala la extensión para continuar.");
            return;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Ensure we are on Sepolia
            await switchToSepolia();

            handleSuccessfulConnection(accounts[0]);
        } catch (error) {
            console.error("Error al conectar la wallet:", error);
            if (error.code === 4001) {
                alert("Conexión rechazada por el usuario.");
            }
        }
    }

    async function switchToSepolia() {
        if (!window.ethereum) return;

        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        if (chainId !== SEPOLIA_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: SEPOLIA_CHAIN_ID,
                                    chainName: 'Sepolia test network',
                                    nativeCurrency: {
                                        name: 'Sepolia Ether',
                                        symbol: 'ETH',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://rpc.sepolia.org'],
                                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                                }
                            ],
                        });
                    } catch (addError) {
                        console.error("Error al añadir la red Sepolia:", addError);
                    }
                }
            }
        }
    }

    async function updatePortfolioAssets(balanceEth) {
        const assetsList = document.getElementById('portfolio-assets-list');
        if (!assetsList) return;

        assetsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-tertiary);"><i class="fa-solid fa-spinner fa-spin"></i> Cargando activos reales...</div>';

        try {
            // Fetch real ETH price from CoinGecko
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            const ethPrice = data.ethereum.usd;
            const ethChange = data.ethereum.usd_24h_change;

            const totalFiat = parseFloat(balanceEth) * ethPrice;

            // Render ETH Asset
            assetsList.innerHTML = `
                <div class="asset-item">
                    <div class="asset-icon" style="background: rgba(98, 126, 234, 0.2); color: #627eea;"><i class="fa-brands fa-ethereum"></i></div>
                    <div class="asset-details">
                        <span class="asset-name">Ethereum (Sepolia)</span>
                        <span class="asset-amount">${parseFloat(balanceEth).toFixed(4)} ETH</span>
                    </div>
                    <div class="asset-value">
                        <span class="fiat-value">$${(parseFloat(balanceEth) * ethPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span class="asset-change ${ethChange >= 0 ? 'positive' : 'negative'}">
                            ${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}%
                        </span>
                    </div>
                </div>
            `;

            // Update Total Balance Card
            if (totalBalanceAmount) {
                totalBalanceAmount.innerHTML = `$${totalFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="currency">USD</span>`;
            }
            if (balanceChangeLabel) {
                balanceChangeLabel.style.display = 'flex';
                balanceChangeLabel.className = `balance-change ${ethChange >= 0 ? 'positive' : 'negative'}`;

                const fiatChange = (totalFiat * ethChange) / 100;
                balanceChangeLabel.innerHTML = `
                    <i class="fa-solid fa-arrow-trend-${ethChange >= 0 ? 'up' : 'down'}"></i> 
                    ${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}% (${fiatChange >= 0 ? '+' : ''}$${Math.abs(fiatChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) hoy
                `;
            }

        } catch (error) {
            console.error("Error fetching crypto prices:", error);
            assetsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Error al cargar activos.</div>';

            // Fallback just show ETH balance
            if (totalBalanceAmount) {
                totalBalanceAmount.innerHTML = `${parseFloat(balanceEth).toFixed(4)} <span class="currency">ETH</span>`;
            }
        }
    }

    async function handleSuccessfulConnection(address) {
        userAddress = address;
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        // Update UI
        connectWalletBtn.style.display = 'none';
        if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block';
        userAddressDisplay.style.display = 'block';

        // Format address: 0x123...abcd
        const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        userAddressDisplay.textContent = shortAddress;
        userAddressDisplay.title = address;

        userNameDisplay.textContent = "Usuario Web3";
        userAvatar.src = `https://ui-avatars.com/api/?name=${address}&background=random&color=fff`;

        // Fetch Balance
        try {
            const balanceWei = await provider.getBalance(address);
            const balanceEth = ethers.formatEther(balanceWei);

            if (networkBadge) {
                networkBadge.innerHTML = `<span class="dot" style="background-color: var(--success);"></span> Sepolia Testnet`;
            }

            await updatePortfolioAssets(balanceEth);
        } catch (e) {
            console.error("Error fetching balance:", e);
        }

        appendMessage('system', '✅ Wallet conectada correctamente a la red Sepolia. Ya puedes enviarme órdenes de transacción.');
    }

    function handleDisconnect() {
        userAddress = null;
        signer = null;
        connectWalletBtn.style.display = 'block';
        if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'none';
        userAddressDisplay.style.display = 'none';
        userNameDisplay.textContent = "Guest";
        userAvatar.src = "https://ui-avatars.com/api/?name=Guest&background=1f1f2e&color=fff";

        // Reset Dashboard
        if (totalBalanceAmount) totalBalanceAmount.innerHTML = `$142,504.20 <span class="currency">USD</span>`;
        if (networkBadge) networkBadge.innerHTML = `<span class="dot"></span> Base L2`;
        if (balanceChangeLabel) {
            balanceChangeLabel.style.display = 'flex';
            balanceChangeLabel.className = 'balance-change positive';
            balanceChangeLabel.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> +2.4% (+$3,420.00) today';
        }

        // Reset Portfolio Assets
        const assetsList = document.getElementById('portfolio-assets-list');
        if (assetsList) {
            assetsList.innerHTML = `
                <div class="asset-item">
                    <div class="asset-icon btc"><i class="fa-brands fa-bitcoin"></i></div>
                    <div class="asset-details">
                        <span class="asset-name">Bitcoin</span>
                        <span class="asset-amount">1.24 BTC</span>
                    </div>
                    <div class="asset-value">
                        <span class="fiat-value">$80,600.00</span>
                        <span class="asset-change positive">+4.2%</span>
                    </div>
                </div>
                <div class="asset-item">
                    <div class="asset-icon usdc"><i class="fa-solid fa-dollar-sign"></i></div>
                    <div class="asset-details">
                        <span class="asset-name">USDC</span>
                        <span class="asset-amount">45,000.00 USDC</span>
                    </div>
                    <div class="asset-value">
                        <span class="fiat-value">$45,000.00</span>
                        <span class="asset-change neutral">0.0%</span>
                    </div>
                </div>
                <div class="asset-item">
                    <div class="asset-icon ars"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <div class="asset-details">
                        <span class="asset-name">Pesos ARS (BaaS)</span>
                        <span class="asset-amount">17,000,000 ARS</span>
                    </div>
                    <div class="asset-value">
                        <span class="fiat-value">$16,904.20</span>
                        <span class="asset-change negative">-0.5%</span>
                    </div>
                </div>
            `;
        }
    }

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', () => {
            if (confirm("¿Desconectar interfaz? (Debes desconectar desde MetaMask para revocar acceso real)")) {
                handleDisconnect();
            }
        });
    }

    // Simulate AI response logic
    const handleCommand = async (command) => {
        // 1. Add user message to UI
        appendMessage('user', command);

        // 2. Clear input
        userInput.value = '';

        // 3. Show "AI is thinking" state
        const thinkingId = appendThinkingState();

        // 4. Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // 5. Remove thinking state
        removeMessage(thinkingId);

        // 6. Basic Intent Router (Simulation & Web3)
        const cmdLower = command.toLowerCase();

        // Check if waiting for an address or amount to complete a transfer
        if (pendingTx) {
            if (!pendingTx.amount) {
                const amountMatch = command.match(/([0-9.,]+)/);
                if (amountMatch) {
                    pendingTx.amount = amountMatch[1].replace(',', '.');
                    const addressMatch = command.match(/(0x[a-fA-F0-9]{40})/i);
                    const toAddress = addressMatch ? addressMatch[1] : pendingTx.address;
                    if (toAddress) {
                        executeWeb3Transfer(pendingTx.amount, toAddress);
                        pendingTx = null;
                    } else {
                        appendMessage('system', `Entendido. ¿A qué dirección de wallet deseas enviar los ${pendingTx.amount} ETH?`);
                    }
                } else if (cmdLower.includes('cancel') || cmdLower === 'no') {
                    pendingTx = null;
                    appendMessage('system', 'Operación de transferencia cancelada.');
                } else {
                    appendMessage('system', 'Por favor, indícame la cantidad de ETH que deseas enviar. (O escribe "cancelar")');
                }
                return;
            }

            const addressMatch = command.match(/(0x[a-fA-F0-9]{40})/i);
            if (addressMatch) {
                const toAddress = addressMatch[1];
                executeWeb3Transfer(pendingTx.amount, toAddress);
                pendingTx = null;
            } else if (cmdLower.includes('cancel') || cmdLower === 'no') {
                pendingTx = null;
                appendMessage('system', 'Operación de transferencia cancelada.');
            } else {
                appendMessage('system', `Aún necesito la dirección de la wallet a la que deseas enviar los ${pendingTx.amount} ETH. (O escribe "cancelar")`);
            }
            return;
        }

        // Regex to match full phrase with address: "mandame 0.1 eth a 0x..."
        const sendFullRegex = /(?:envi|transfer|mand|pas|giv)[a-záéíóú]*\s+([0-9.,]+)\s*eth.*?([a-fA-F0-9]{40})/i;
        const matchFull = command.match(sendFullRegex);

        // Regex to match only the intent and amount: "mandame 0.1 eth"
        const sendPartialRegex = /(?:envi|transfer|mand|pas|giv)[a-záéíóú]*\s+([0-9.,]+)\s*eth/i;
        const matchPartial = command.match(sendPartialRegex);

        // Regex to match general intent without amount: "quiero enviar eth"
        const sendIntentRegex = /(?:envi|transfer|mand|pas|giv).*?eth/i;
        const matchIntent = command.match(sendIntentRegex);

        if (matchFull) {
            const amount = matchFull[1].replace(',', '.'); // Handle comma as decimal separator

            // Reconstruct the 0x prefix if lost in regex
            let rawAddress = matchFull[2];
            if (!rawAddress.startsWith('0x')) rawAddress = '0x' + rawAddress;

            executeWeb3Transfer(amount, rawAddress);
        } else if (matchPartial) {
            const amount = matchPartial[1].replace(',', '.');
            pendingTx = { amount };
            appendMessage('system', `Entendido. ¿A qué dirección de wallet deseas enviar los ${amount} ETH?`);
        } else if (matchIntent) {
            let capturedAddr = command.match(/(0x[a-fA-F0-9]{40})/i);
            pendingTx = { amount: null, address: capturedAddr ? capturedAddr[1] : null };
            if (pendingTx.address) {
                appendMessage('system', `Entendido. ¿Qué cantidad de ETH deseas enviar a la dirección ${pendingTx.address.substring(0, 6)}...?`);
            } else {
                appendMessage('system', `Entendido. ¿Qué cantidad de ETH deseas enviar?`);
            }
        } else if (cmdLower.includes('invert') && cmdLower.includes('100k') && cmdLower.includes('bajo riesgo')) {
            simulateInvestmentFlow();
        } else if (cmdLower.includes('btc') && cmdLower.includes('compr')) {
            simulateCryptoPurchase();
        } else if (cmdLower.includes('resumen')) {
            simulateSummary();
        } else {
            appendMessage('system', 'Entendido. Estoy analizando tu petición en el contexto de tu portafolio actual y los mercados en tiempo real. ¿Deseas proceder con una simulación de riesgo?');
        }
    };

    // Chat Event Listeners
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) handleCommand(text);
    });

    quickPrompts.forEach(prompt => {
        prompt.addEventListener('click', () => {
            // Get text without the quotes
            const text = prompt.textContent.replace(/"/g, '');
            handleCommand(text);
        });
    });

    // UI Helper Functions
    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-msg slide-in`;

        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';

        if (typeof text === 'string') {
            const p = document.createElement('p');
            p.textContent = text;
            contentDiv.appendChild(p);
        } else {
            // Append HTML element if it's a widget
            contentDiv.appendChild(text);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentDiv);

        chatContainer.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv;
    }

    function appendThinkingState() {
        const id = 'thinking-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message system-msg slide-in`;
        msgDiv.id = id;

        msgDiv.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-content">
                <p style="color: var(--text-tertiary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Analizando riesgo y liquidez...</p>
            </div>
        `;

        chatContainer.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function removeMessage(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --- Simulated Flows & Web3 Executions ---

    async function executeWeb3Transfer(amount, toAddress) {
        if (!userAddress || !signer) {
            appendMessage('system', '❌ Error: Necesitas conectar tu wallet primero antes de enviar una transacción.');
            return;
        }

        const widgetId = 'tx-' + Date.now();
        const p = document.createElement('p');
        p.textContent = `Preparando transacción en la red Sepolia. Por favor, confirma en MetaMask.`;

        const widget = document.createElement('div');
        widget.className = 'ai-widget';
        widget.id = widgetId;
        widget.innerHTML = `
            <div class="ai-widget-header">
                <span><i class="fa-solid fa-spinner fa-spin" style="color:var(--warning)"></i> Esperando Firma...</span>
                <span>Sepolia Testnet</span>
            </div>
            <div class="ai-widget-body">
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Destino:</div>
                    <div style="font-weight: 600; font-family: monospace; font-size: 0.85rem;">${toAddress}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Monto a enviar:</div>
                    <div style="color: var(--success); font-weight: 600;">${amount} ETH</div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.appendChild(p);
        container.appendChild(widget);
        appendMessage('system', container);

        try {
            // Parse Ether amount
            const value = ethers.parseEther(amount.toString());

            // Send transaction
            const tx = await signer.sendTransaction({
                to: toAddress,
                value: value
            });

            // Update widget to indicate it's broadcasting
            widget.innerHTML = `
                <div class="ai-widget-header">
                    <span><i class="fa-solid fa-satellite-dish" style="color:var(--brand-blue)"></i> Transacción Enviada</span>
                    <span>Procesando...</span>
                </div>
                <div class="ai-widget-body">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Hash de Transacción:</div>
                        <div style="font-weight: 600; font-family: monospace; font-size: 0.8rem;"><a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" style="color: var(--brand-blue); text-decoration: none;">${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
                    </div>
                </div>
            `;

            // Wait for confirmation
            await tx.wait(1);

            // Final Update
            widget.innerHTML = `
                <div class="ai-widget-header">
                    <span><i class="fa-solid fa-shield-check" style="color:var(--success)"></i> Transacción Exitosa</span>
                    <span>Confirmada</span>
                </div>
                <div class="ai-widget-body">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Hash de Transacción:</div>
                        <div style="font-weight: 600; font-family: monospace; font-size: 0.8rem;"><a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" style="color: var(--brand-blue); text-decoration: none;">${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Enviado:</div>
                        <div style="color: var(--success); font-weight: 600;">${amount} ETH</div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error(error);
            widget.innerHTML = `
                <div class="ai-widget-header" style="background: rgba(220, 38, 38, 0.1);">
                    <span style="color: #ef4444;"><i class="fa-solid fa-circle-xmark"></i> Transacción Fallida</span>
                </div>
                <div class="ai-widget-body">
                    <p style="font-size: 0.85rem; color: #ef4444;">${error.reason || error.message}</p>
                </div>
            `;
        }
    }

    function simulateInvestmentFlow() {
        const p = document.createElement('p');
        p.textContent = 'Analicé los yields actuales en Base. Te propongo diversificar $100,000 USDC en yields estables del 6% APY en Aave V3. El riesgo validado es nivel 1 (Muy Bajo).';

        const widget = document.createElement('div');
        widget.className = 'ai-widget';
        widget.innerHTML = `
            <div class="ai-widget-header">
                <span><i class="fa-solid fa-shield-check" style="color:var(--success)"></i> Simulación Completada</span>
                <span>Gas: $0.02 (Subsidized)</span>
            </div>
            <div class="ai-widget-body">
                <div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Ruta:</div>
                    <div style="font-weight: 600;">USDC Wallet → Aave V3 (Base)</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Proyección Anual:</div>
                    <div style="color: var(--success); font-weight: 600;">+$6,000.00 USDC</div>
                </div>
            </div>
            <div class="widget-actions">
                <button class="widget-btn confirm" onclick="this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Ejecutado'; this.style.background='var(--success)'; this.disabled=true;">Ejecutar con Passkey</button>
                <button class="widget-btn cancel" onclick="this.closest('.ai-widget').remove()">Cancelar</button>
            </div>
        `;

        const container = document.createElement('div');
        container.appendChild(p);
        container.appendChild(widget);

        appendMessage('system', container);
    }

    function simulateCryptoPurchase() {
        const text = 'He parametrizado la orden. Se ejecutará una orden límite descentralizada vía Uniswap V3 en Base.';
        const widget = document.createElement('div');
        widget.className = 'ai-widget';
        widget.innerHTML = `
            <div class="ai-widget-header">
                <span>Orden Condicional Creada</span>
                <span>Expira: 30 días</span>
            </div>
            <div class="ai-widget-body">
                <div>
                    <div style="font-weight: 600;">Comprar 0.5 BTC</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Ruta de liquidez verificada</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">Precio Límite (Max):</div>
                    <div style="color: var(--warning); font-weight: 600;">$60,000.00</div>
                </div>
            </div>
            <div class="widget-actions">
                <button class="widget-btn confirm" onclick="this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Firmado y Activo'; this.style.background='var(--success)'; this.disabled=true;">Firmar Smart Contract</button>
                <button class="widget-btn cancel" onclick="this.closest('.ai-widget').remove()">Descartar orden</button>
            </div>
        `;
        const container = document.createElement('div');
        const p = document.createElement('p'); p.textContent = text;
        container.appendChild(p); container.appendChild(widget);
        appendMessage('system', container);
    }

    function simulateSummary() {
        appendMessage('system', 'Tu balance total es equivalente a $142,504.20 USD. Esta semana generaste $3,420 en rendimientos pasivos gracias a las reglas configuradas por la IA. El 30% está alojado en USDC en Base para operaciones diarias y el 70% restante en reserva fría descentralizada a través de Multi-Sig.');
    }
});
