document.addEventListener('DOMContentLoaded', function () {
    const refundForm = document.getElementById('refundForm');
    const generateFreeBtn = document.getElementById('generateFree');
    const generatePremiumBtn = document.getElementById('generatePremium');
    const letterContainer = document.getElementById('letterContainer');
    const generatedLetter = document.getElementById('generatedLetter');
    const copyLetterBtn = document.getElementById('copyLetter');
    const paymentModal = document.getElementById('paymentModal');
    const closeModal = document.querySelector('.close');
    let submitPaymentBtn = document.getElementById('submitPayment');

    // Initialize Stripe
    const stripe = Stripe('pk_test_51Rp5gMBjRGtHSh35i942Hbb4gqHAT21HJ1B4lba7UHJKlB4kDHTwcaL8jRksGRiFf7yHugV5TdP1GAwnLDaX6aXR00d0ErIHAw');
    let elements;

    // Generate free letter
    generateFreeBtn.addEventListener('click', function () {
        if (!refundForm.checkValidity()) {
            refundForm.reportValidity();
            return;
        }

        const formData = new FormData(refundForm);
        const data = Object.fromEntries(formData.entries());

        generateLetter(data, false);
    });

    // Generate premium letter - show payment modal
    generatePremiumBtn.addEventListener('click', function () {
        if (!refundForm.checkValidity()) {
            refundForm.reportValidity();
            return;
        }

        paymentModal.classList.remove('hidden');
        initializePayment();
    });

    // Close modal
    closeModal.addEventListener('click', function () {
        paymentModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === paymentModal) {
            paymentModal.classList.add('hidden');
        }
    });

    // Copy letter to clipboard
    copyLetterBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(generatedLetter.textContent)
            .then(() => {
                copyLetterBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyLetterBtn.textContent = 'Copy Letter';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });

    // Generate letter using AI
    function generateLetter(data, isPremium) {
        // Show loading state
        if (isPremium) {
            submitPaymentBtn.disabled = true;
            submitPaymentBtn.textContent = 'Generating Letter...';
        } else {
            generateFreeBtn.disabled = true;
            generateFreeBtn.textContent = 'Generating...';
        }

        // Prepare the data to send to the server
        const requestData = {
            ...data,
            isPremium: isPremium
        };

        // Send data to PHP backend
        fetch('generate_letter.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    generatedLetter.textContent = data.letter;
                    letterContainer.classList.remove('hidden');

                    if (isPremium) {
                        // Process premium features (email + PDF)
                        fetch('premium_processing.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: requestData.email,
                                fullName: requestData.fullName,
                                letter: data.letter
                            })
                        })
                        .then(response => response.json())
                        .then(premiumData => {
                            paymentModal.classList.add('hidden');
                            if (premiumData.success) {
                                // Show success toast
                                showSuccessToast('✅ Premium letter generated and sent to your email with PDF attachment!');
                                // Show PDF download button
                                document.getElementById('downloadPdf').classList.remove('hidden');
                                // Show email sharing button
                                document.getElementById('shareEmail').classList.remove('hidden');
                                // Add premium styling to letter
                                document.getElementById('generatedLetter').parentElement.classList.add('premium-letter');
                            } else {
                                showErrorToast('⚠️ Letter generated but email delivery failed: ' + premiumData.error);
                                // Still show PDF button since premium was paid
                                document.getElementById('downloadPdf').classList.remove('hidden');
                                // Show email sharing button
                                document.getElementById('shareEmail').classList.remove('hidden');
                            }
                        })
                        .catch(error => {
                            console.error('Premium processing error:', error);
                            paymentModal.classList.add('hidden');
                            showErrorToast('❌ Letter generated but premium processing failed. Please contact support.');
                            // Still show PDF button since payment was successful
                            document.getElementById('downloadPdf').classList.remove('hidden');
                            // Show email sharing button
                            document.getElementById('shareEmail').classList.remove('hidden');
                        });
                    }
                } else {
                    alert('Error generating letter: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while generating the letter.');
            })
            .finally(() => {
                if (isPremium) {
                    submitPaymentBtn.disabled = false;
                    submitPaymentBtn.textContent = 'Pay $4.99';
                } else {
                    generateFreeBtn.disabled = false;
                    generateFreeBtn.textContent = 'Generate Free Letter';
                }
            });
    }

    // Initialize Stripe payment
    async function initializePayment() {
        try {
            // Clear any existing payment element first
            const paymentElementContainer = document.getElementById('paymentElement');
            if (paymentElementContainer) {
                paymentElementContainer.innerHTML = '';
            }

            // Create payment intent
            const response = await fetch('create_payment_intent.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.clientSecret) {
                throw new Error('No client secret received from server');
            }

            // Create payment elements with client secret
            elements = stripe.elements({ 
                clientSecret: data.clientSecret,
                appearance: {
                    theme: 'stripe'
                }
            });

            const paymentElement = elements.create('payment', {
                layout: 'tabs'
            });

            // Wait a bit before mounting to ensure DOM is ready
            setTimeout(() => {
                paymentElement.mount('#paymentElement');
            }, 100);

            // Handle form submission - remove any existing listeners first
            const newSubmitBtn = submitPaymentBtn.cloneNode(true);
            submitPaymentBtn.parentNode.replaceChild(newSubmitBtn, submitPaymentBtn);
            submitPaymentBtn = newSubmitBtn; // Update global reference

            newSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                newSubmitBtn.disabled = true;
                newSubmitBtn.textContent = 'Processing...';

                try {
                    const { error } = await stripe.confirmPayment({
                        elements,
                        confirmParams: {
                            return_url: window.location.href.split('?')[0],
                        },
                        redirect: 'if_required'
                    });

                    if (error) {
                        throw new Error(error.message);
                    } else {
                        // Payment succeeded - generate premium letter
                        const formData = new FormData(refundForm);
                        const letterData = Object.fromEntries(formData.entries());
                        generateLetter(letterData, true);
                    }
                } catch (paymentError) {
                    console.error('Payment error:', paymentError);
                    alert('Payment failed: ' + paymentError.message);
                    newSubmitBtn.disabled = false;
                    newSubmitBtn.textContent = 'Pay $4.99';
                }
            });
        } catch (error) {
            console.error('Error initializing payment:', error);
            alert('Error setting up payment: ' + error.message + '. Please try again.');
        }
    }

    // Toast notification functions
    function showSuccessToast(message) {
        showToast(message, 'success');
    }

    function showErrorToast(message) {
        showToast(message, 'error');
    }

    function showToast(message, type) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // PDF Download function
    window.downloadPDF = function() {
        const downloadBtn = document.getElementById('downloadPdf');
        const originalText = downloadBtn.textContent;
        
        // Show loading state
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Generating PDF...';
        
        const formData = new FormData(refundForm);
        const data = Object.fromEntries(formData.entries());
        data.letter = generatedLetter.textContent;

        fetch('generate_pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error: ${text}`);
                });
            }
            
            // Check content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Invalid response format - not a PDF file');
            }
            
            return response.blob();
        })
        .then(blob => {
            if (blob.size === 0) {
                throw new Error('PDF file is empty');
            }
            
            // Create download link with better compatibility for IDM
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'premium_refund_letter_' + new Date().toISOString().split('T')[0] + '.pdf';
            a.target = '_blank';
            
            document.body.appendChild(a);
            a.click();
            
            // Clean up after a delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 1000);
            
            showSuccessToast('✅ PDF download started successfully!');
        })
        .catch(error => {
            console.error('Error downloading PDF:', error);
            showErrorToast('❌ PDF download failed: ' + error.message + '. Please try again.');
        })
        .finally(() => {
            // Reset button state
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
        });
    };

    // Email sharing function
    window.shareViaEmail = function() {
        const shareBtn = document.getElementById('shareEmail');
        const originalText = shareBtn.textContent;
        
        // Create email sharing modal
        const modal = document.createElement('div');
        modal.className = 'modal email-share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📧 Share Premium Letter via Email</h3>
                    <span class="close share-close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Send your premium refund letter to any email address:</p>
                    <input type="email" id="shareEmailInput" placeholder="Enter email address" class="share-email-input">
                    <button id="sendEmailBtn" class="send-email-btn">Send Letter 📤</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.share-close');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        };
        
        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => document.body.removeChild(modal), 300);
            }
        };
        
        // Send email functionality
        const sendBtn = modal.querySelector('#sendEmailBtn');
        const emailInput = modal.querySelector('#shareEmailInput');
        
        sendBtn.onclick = () => {
            const email = emailInput.value.trim();
            
            if (!email) {
                showErrorToast('❌ Please enter an email address');
                return;
            }
            
            if (!email.includes('@') || !email.includes('.')) {
                showErrorToast('❌ Please enter a valid email address');
                return;
            }
            
            // Show loading
            sendBtn.disabled = true;
            sendBtn.textContent = '📤 Sending...';
            
            const formData = new FormData(refundForm);
            const data = Object.fromEntries(formData.entries());
            data.letter = generatedLetter.textContent;
            data.shareEmail = email;
            
            fetch('share_email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showSuccessToast('✅ Premium letter sent successfully to ' + email);
                    modal.classList.remove('show');
                    setTimeout(() => document.body.removeChild(modal), 300);
                } else {
                    showErrorToast('❌ Failed to send email: ' + result.error);
                }
            })
            .catch(error => {
                console.error('Email sharing error:', error);
                showErrorToast('❌ Failed to send email. Please try again.');
            })
            .finally(() => {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Letter 📤';
            });
        };
        
        // Focus on email input
        emailInput.focus();
    };
});