document.addEventListener('DOMContentLoaded', function () {
    const refundForm = document.getElementById('refundForm');
    const generateFreeBtn = document.getElementById('generateFree');
    const generatePremiumBtn = document.getElementById('generatePremium');
    const letterContainer = document.getElementById('letterContainer');
    const generatedLetter = document.getElementById('generatedLetter');
    const copyLetterBtn = document.getElementById('copyLetter');
    const paymentModal = document.getElementById('paymentModal');
    const closeModal = document.querySelector('.close');
    const submitPaymentBtn = document.getElementById('submitPayment');

    // Initialize Stripe
    const stripe = Stripe('pk_live_51Rp5gFBpnow2VOeaQvZlUau13AhA7L48stK8qf7puDCRHeff0HraLiD9HXtafgE3TNknE9AX0kFnJ5a9900C2EEC003btzB7FZ');
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
                        paymentModal.classList.add('hidden');
                        // In a real app, you would send the email and PDF here
                        alert('Premium letter generated! Check your email for the PDF.');
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
    function initializePayment() {
        // Create payment elements
        elements = stripe.elements();
        const paymentElement = elements.create('payment');
        paymentElement.mount('#paymentElement');

        // Handle form submission
        submitPaymentBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            submitPaymentBtn.disabled = true;
            submitPaymentBtn.textContent = 'Processing...';

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
            });

            if (error) {
                alert(error.message);
                submitPaymentBtn.disabled = false;
                submitPaymentBtn.textContent = 'Pay $4.99';
            } else {
                // Payment succeeded - generate premium letter
                const formData = new FormData(refundForm);
                const data = Object.fromEntries(formData.entries());
                generateLetter(data, true);
            }
        });
    }
});