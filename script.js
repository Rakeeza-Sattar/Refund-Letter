document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const serviceTypeSelect = document.getElementById('serviceType');
    const airlineFields = document.getElementById('airlineFields');
    const hotelFields = document.getElementById('hotelFields');
    const generateFreeBtn = document.getElementById('generateFree');
    const generatePremiumBtn = document.getElementById('generatePremium');
    const refundForm = document.getElementById('refundForm');
    const letterContainer = document.getElementById('letterContainer');
    const generatedLetter = document.getElementById('generatedLetter');
    const copyLetterBtn = document.getElementById('copyLetter');
    const paymentModal = document.getElementById('paymentModal');
    const closeModal = document.querySelector('.close');
    const paymentLoader = document.getElementById('paymentLoader');
    let submitPaymentBtn = document.getElementById('submitPayment'); // Keep original reference for initial setup

    // Toast notification system
    function showToast(message, type = 'success') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Hide toast after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Initialize Stripe (replace with your publishable key)
    const stripe = Stripe('pk_test_51QalRGGINHU4Ss6HTiLVBSMQPRXV5sG8j4UQqB0Pr1sO7ktqK4X8zJ8r5I0dUNqAx5RJP34o3ORWkdxsjAZeLLPX00dNzlmRRX');
    let elements;
    let paymentElement;

    // Handle service type changes
    serviceTypeSelect.addEventListener('change', function () {
        const selectedType = this.value;

        // Hide all conditional fields first
        airlineFields.classList.add('hidden');
        hotelFields.classList.add('hidden');

        // Show relevant fields based on selection
        if (selectedType === 'Airline') {
            airlineFields.classList.remove('hidden');
            // Make flight date required
            document.getElementById('flightDate').required = true;
            document.getElementById('checkinDate').required = false;
        } else if (selectedType === 'Hotel') {
            hotelFields.classList.remove('hidden');
            // Make checkin date required
            document.getElementById('checkinDate').required = true;
            document.getElementById('flightDate').required = false;
        }

        // Update company name placeholder
        const companyNameField = document.getElementById('companyName');
        if (selectedType === 'Airline') {
            companyNameField.placeholder = 'e.g., Delta Airlines, United Airlines';
        } else if (selectedType === 'Hotel') {
            companyNameField.placeholder = 'e.g., Marriott Hotel, Hilton';
        } else {
            companyNameField.placeholder = 'e.g., Delta Airlines, Marriott Hotel';
        }
    });

    // Form validation function
    function validateForm(isPremium = false) {
        const requiredFields = [
            'fullName', 'email', 'serviceType', 'companyName',
            'bookingNumber', 'issueType', 'description'
        ];

        const serviceType = document.getElementById('serviceType').value;
        if (serviceType === 'Airline') {
            requiredFields.push('flightDate');
        } else if (serviceType === 'Hotel') {
            requiredFields.push('checkinDate');
        }

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                const label = field ? field.previousElementSibling : null;
                const labelText = label ? label.textContent.replace('*', '').trim() : fieldId;
                showToast(`Please fill in ${labelText}`, 'error');
                if (field) field.focus();
                return false;
            }
        }

        // Email validation
        const email = document.getElementById('email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            document.getElementById('email').focus();
            return false;
        }

        return true;
    }

    // Collect form data function
    function collectFormData(isPremium = false) {
        const serviceType = document.getElementById('serviceType').value;

        const data = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            serviceType: serviceType,
            companyName: document.getElementById('companyName').value.trim(),
            bookingNumber: document.getElementById('bookingNumber').value.trim(),
            issueType: document.getElementById('issueType').value,
            description: document.getElementById('description').value.trim()
        };

        // Add service-specific fields
        if (serviceType === 'Airline') {
            data.date = document.getElementById('flightDate').value;
            data.departureCity = document.getElementById('departureCity').value.trim();
            data.arrivalCity = document.getElementById('arrivalCity').value.trim();
            if (isPremium) {
                data.loyaltyNumber = document.getElementById('loyaltyNumber').value.trim();
            }
        } else if (serviceType === 'Hotel') {
            data.date = document.getElementById('checkinDate').value;
            data.nightsStayed = document.getElementById('nightsStayed').value;
            if (isPremium) {
                data.hotelLoyaltyNumber = document.getElementById('hotelLoyaltyNumber').value.trim();
                data.reservationPlatform = document.getElementById('reservationPlatform').value.trim();
            }
        }

        // Add premium fields
        if (isPremium) {
            data.desiredOutcome = document.getElementById('desiredOutcome').value;
            data.generalPlatform = document.getElementById('generalPlatform').value.trim();
        }

        return data;
    }

    // Generate letter using AI
    function generateLetter(data, isPremium = false) {
        const button = isPremium ? submitPaymentBtn : generateFreeBtn;
        const originalText = button.textContent;

        // Show loading state
        button.disabled = true;
        button.textContent = isPremium ? 'Generating Letter...' : 'Generating...';

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
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    generatedLetter.textContent = data.letter;
                    letterContainer.classList.remove('hidden');

                    // Show appropriate download/share buttons for premium
                    if (isPremium) {
                        document.getElementById('downloadPdf').classList.remove('hidden');
                        document.getElementById('shareEmail').classList.remove('hidden');
                    }

                    // Scroll to letter
                    letterContainer.scrollIntoView({ behavior: 'smooth' });

                    showToast(isPremium ? 'Premium letter generated successfully!' : 'Free letter generated successfully!', 'success');

                    // Close payment modal if open
                    if (isPremium && paymentModal) {
                        paymentModal.classList.add('hidden');
                    }
                } else {
                    throw new Error(data.error || 'Failed to generate letter');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to generate letter. Please try again.', 'error');
            })
            .finally(() => {
                button.disabled = false;
                button.textContent = originalText;
            });
    }

    // Generate free letter
    generateFreeBtn.addEventListener('click', function (e) {
        e.preventDefault();

        if (!validateForm(false)) {
            return;
        }

        const formData = collectFormData(false);
        generateLetter(formData, false);
    });

    // Generate premium letter - show payment modal
    generatePremiumBtn.addEventListener('click', function (e) {
        e.preventDefault();

        if (!validateForm(true)) {
            return;
        }

        // Show payment modal
        paymentModal.classList.remove('hidden');
        initializePayment();
    });

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
                body: JSON.stringify({ amount: 499 }) // $4.99
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
                    theme: 'stripe' // Use Stripe's default theme
                }
            });

            paymentElement = elements.create('payment', {
                layout: 'tabs' // Or 'accordion'
            });

            // Wait a bit before mounting to ensure DOM is ready and element is available
            setTimeout(() => {
                paymentElement.mount('#paymentElement');
            }, 100);

            // Handle form submission - we attach the listener to the button provided by the modal
            // The original logic to clone and replace the button is complex and might not be needed if we handle it correctly here.
            // We'll re-use the global submitPaymentBtn reference.

        } catch (error) {
            console.error('Error initializing payment:', error);
            showToast('Payment initialization failed: ' + error.message, 'error');
        }
    }

    // Handle payment submission
    submitPaymentBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        if (!elements || !paymentElement) {
            showToast('Payment not initialized', 'error');
            return;
        }

        // Show payment loader
        paymentLoader.classList.remove('hidden');
        submitPaymentBtn.disabled = true; // Disable button while processing
        submitPaymentBtn.textContent = 'Processing...';

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/payment_success.html', // A success page to redirect to
                },
                redirect: 'if_required' // Redirect if necessary, otherwise process in the same page
            });

            if (error) {
                // Show the error message to the user
                throw new Error(error.message);
            } else {
                // Payment successful - generate premium letter
                const letterData = collectFormData(true);
                generateLetter(letterData, true);
            }
        } catch (paymentError) {
            console.error('Payment error:', paymentError);
            showToast('Payment failed: ' + paymentError.message, 'error');
        } finally {
            // Hide payment loader and re-enable button only if generation failed or payment itself failed
            // If letter generation is successful, it handles button state itself.
            if (paymentLoader) paymentLoader.classList.add('hidden');
            if (submitPaymentBtn && !paymentLoader.classList.contains('hidden')) { // Only reset if generation didn't happen.
                submitPaymentBtn.disabled = false;
                submitPaymentBtn.textContent = 'Pay $4.99';
            }
        }
    });


    // Copy letter to clipboard
    copyLetterBtn.addEventListener('click', function () {
        const letterText = generatedLetter.textContent;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(letterText)
                .then(() => {
                    showToast('Letter copied to clipboard!', 'success');
                    copyLetterBtn.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyLetterBtn.innerHTML = '📋 Copy Letter';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast('Failed to copy letter', 'error');
                });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = letterText;
            textArea.style.position = 'fixed'; // Prevent scrolling
            textArea.style.left = '-9999px'; // Move off-screen
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                showToast('Letter copied to clipboard!', 'success');
                copyLetterBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyLetterBtn.innerHTML = '📋 Copy Letter';
                }, 2000);
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                showToast('Failed to copy letter', 'error');
            }

            document.body.removeChild(textArea);
        }
    });

    // Modal close handlers
    closeModal.addEventListener('click', function () {
        paymentModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === paymentModal) {
            paymentModal.classList.add('hidden');
        }
    });

    // PDF Download function
    window.downloadPDF = function () {
        const downloadBtn = document.getElementById('downloadPdf');
        const originalText = downloadBtn.textContent;

        // Show loading state
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Generating PDF...';
        showToast('Generating PDF...', 'info');

        const formData = collectFormData(true); // Collect premium data
        const letterText = generatedLetter.textContent;

        fetch('generate_pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName: formData.fullName,
                email: formData.email, // Include email for context if needed by backend
                letter: letterText
            })
        })
            .then(response => {
                if (!response.ok) {
                    // Attempt to get error message from response body
                    return response.text().then(text => {
                        throw new Error(`PDF generation failed: ${text || response.statusText}`);
                    });
                }
                // Check content type to ensure it's a PDF
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

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `premium_refund_letter_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();

                // Clean up blob URL and element
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 1000);

                showToast('PDF downloaded successfully!', 'success');
            })
            .catch(error => {
                console.error('PDF download error:', error);
                showToast('Failed to download PDF: ' + error.message, 'error');
            })
            .finally(() => {
                // Reset button state
                downloadBtn.disabled = false;
                downloadBtn.textContent = originalText;
            });
    };

    // Email sharing function
    window.shareViaEmail = function () {
        const shareBtn = document.getElementById('shareEmail');
        const originalText = shareBtn.textContent;

        // Create email sharing modal directly within the scope
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

        // Local variables for modal elements
        const closeBtn = modal.querySelector('.share-close');
        const sendBtn = modal.querySelector('#sendEmailBtn');
        const emailInput = modal.querySelector('#shareEmailInput');

        // Close modal functionality
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
        sendBtn.onclick = () => {
            const email = emailInput.value.trim();

            if (!email) {
                showToast('❌ Please enter an email address', 'error');
                return;
            }

            // Basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('❌ Please enter a valid email address', 'error');
                return;
            }

            // Show loading
            sendBtn.disabled = true;
            sendBtn.textContent = '📤 Sending...';
            showToast('Sending email...', 'info');

            const formData = collectFormData(true); // Collect premium data
            const letterText = generatedLetter.textContent;

            fetch('share_email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email, // Original email from form
                    shareEmail: email,     // New email to share with
                    letter: letterText
                })
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        showToast('✅ Premium letter sent successfully to ' + email, 'success');
                        modal.classList.remove('show');
                        setTimeout(() => document.body.removeChild(modal), 300);
                    } else {
                        throw new Error(result.error || 'Failed to send email');
                    }
                })
                .catch(error => {
                    console.error('Email sharing error:', error);
                    showToast('❌ Failed to send email: ' + error.message, 'error');
                })
                .finally(() => {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send Letter 📤';
                });
        };

        // Focus on email input
        emailInput.focus();
    };

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Initial service type display based on current value
    const initialServiceType = serviceTypeSelect.value;
    if (initialServiceType === 'Airline') {
        airlineFields.classList.remove('hidden');
        document.getElementById('flightDate').required = true;
        document.getElementById('checkinDate').required = false;
    } else if (initialServiceType === 'Hotel') {
        hotelFields.classList.remove('hidden');
        document.getElementById('checkinDate').required = true;
        document.getElementById('flightDate').required = false;
    }
});