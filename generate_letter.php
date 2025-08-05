<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

function generateRefundLetter($data, $isPremium = false) {
    $fullName = $data['fullName'] ?? '';
    $email = $data['email'] ?? '';
    $companyName = $data['companyName'] ?? '';
    $bookingNumber = $data['bookingNumber'] ?? '';
    $date = $data['date'] ?? '';
    $issueType = $data['issueType'] ?? '';
    $description = $data['description'] ?? '';
    $serviceType = $data['serviceType'] ?? '';

    $currentDate = date('F d, Y');

    // Service-specific details
    $serviceDetails = '';
    if ($serviceType === 'Airline') {
        $serviceDetails = "- Flight Date: " . date('F d, Y', strtotime($date));
        if (!empty($data['departureCity']) && $isPremium) {
            $serviceDetails .= "\n- Departure City: " . $data['departureCity'];
        }
        if (!empty($data['arrivalCity']) && $isPremium) {
            $serviceDetails .= "\n- Arrival City: " . $data['arrivalCity'];
        }
        if (!empty($data['loyaltyNumber']) && $isPremium) {
            $serviceDetails .= "\n- Frequent Flyer Number: " . $data['loyaltyNumber'];
        }
    } else if ($serviceType === 'Hotel') {
        $serviceDetails = "- Check-in Date: " . date('F d, Y', strtotime($date));
        if (!empty($data['nightsStayed'])) {
            $serviceDetails .= "\n- Nights Stayed: " . $data['nightsStayed'];
        }
        if (!empty($data['hotelLoyaltyNumber']) && $isPremium) {
            $serviceDetails .= "\n- Loyalty Number: " . $data['hotelLoyaltyNumber'];
        }
        if (!empty($data['reservationPlatform']) && $isPremium) {
            $serviceDetails .= "\n- Booked Through: " . $data['reservationPlatform'];
        }
    }

    // Basic letter template
    $letter = "Dear {$companyName} Customer Service Team,

I am writing to formally request a refund for my recent " . strtolower($serviceType) . " booking with your company. Below are the details of my reservation and the issues I encountered:

BOOKING INFORMATION:
- Name: {$fullName}
- Email: {$email}
- Booking/Ticket Number: {$bookingNumber}
{$serviceDetails}
- Issue Type: {$issueType}

ISSUE DESCRIPTION:
{$description}

";

    // Add desired outcome if premium
    if ($isPremium && !empty($data['desiredOutcome'])) {
        $letter .= "REQUESTED RESOLUTION:
I am seeking " . strtolower($data['desiredOutcome']) . " for this service failure. ";

        if ($data['desiredOutcome'] === 'Full Refund') {
            $letter .= "Given the significant impact this has had on my travel plans, I believe a full refund is the most appropriate resolution.";
        } elseif ($data['desiredOutcome'] === 'Voucher') {
            $letter .= "I would be willing to accept a voucher or credit for future use, provided it includes additional compensation for the inconvenience caused.";
        } elseif ($data['desiredOutcome'] === 'Compensation') {
            $letter .= "I am seeking monetary compensation that reflects the inconvenience, additional expenses, and impact this service failure has had.";
        }

        $letter .= "\n\n";
    }

    if ($isPremium) {
        $regulations = '';
        if ($serviceType === 'Airline') {
            $regulations = "LEGAL REFERENCES:
In accordance with the U.S. Department of Transportation regulations and Federal Trade Commission guidelines, I am entitled to appropriate compensation for this service failure. Specifically:

- DOT regulations (14 CFR Part 250) require airlines to provide compensation for denied boarding and significant delays
- DOT regulations (14 CFR Part 259) mandate passenger rights for tarmac delays and cancellations
- FTC guidelines require that companies honor their advertised services and provide remedies when they fail to do so
- The Montreal Convention may apply for international flights regarding compensation limits

";
        } else {
            $regulations = "LEGAL REFERENCES:
In accordance with Federal Trade Commission guidelines and state consumer protection laws, I am entitled to appropriate remedies for this service failure. Specifically:

- FTC guidelines mandate that companies honor their advertised services and provide remedies when they fail to do so
- State consumer protection laws provide recourse for deceptive or unfair business practices
- The service contract between us obligates you to provide the accommodations as booked

";
        }

        $letter .= $regulations;
        $letter .= "I have documented this incident thoroughly and am prepared to escalate this matter to the appropriate regulatory authorities if necessary.

";
    }

    $letter .= "I trust that {$companyName} values customer satisfaction and will resolve this matter promptly. I look forward to your response within 7-10 business days.

Thank you for your attention to this matter.

Sincerely,
{$fullName}
{$email}

Date: {$currentDate}";

    return $letter;
}

// OpenAI API configuration
$openai_api_key = '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'; // Replace with your actual API key

// Get the POST data
$data = $input;

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'No data received']);
    exit;
}

$isPremium = isset($data['isPremium']) ? $data['isPremium'] : false;

// Build the prompt
$prompt = "Generate a professional refund request letter for the following situation:\n\n";
$prompt .= "Customer Name: " . $data['fullName'] . "\n";
$prompt .= "Company: " . $data['companyName'] . "\n";
$prompt .= "Booking Number: " . $data['bookingNumber'] . "\n";
$prompt .= "Date: " . $data['date'] . "\n";
$prompt .= "Issue Type: " . $data['issueType'] . "\n";
$prompt .= "Description: " . $data['description'] . "\n\n";
$prompt .= "Service Type: " . $data['serviceType'] . "\n";

if ($data['serviceType'] === 'Airline') {
    $prompt .= "Flight Date: " . $data['date'] . "\n";
    if (!empty($data['departureCity'])) $prompt .= "Departure City: " . $data['departureCity'] . "\n";
    if (!empty($data['arrivalCity'])) $prompt .= "Arrival City: " . $data['arrivalCity'] . "\n";
    if (!empty($data['loyaltyNumber'])) $prompt .= "Loyalty Number: " . $data['loyaltyNumber'] . "\n";
} elseif ($data['serviceType'] === 'Hotel') {
    $prompt .= "Check-in Date: " . $data['date'] . "\n";
    if (!empty($data['nightsStayed'])) $prompt .= "Number of Nights Stayed: " . $data['nightsStayed'] . "\n";
    if (!empty($data['hotelLoyaltyNumber'])) $prompt .= "Hotel Loyalty Number: " . $data['hotelLoyaltyNumber'] . "\n";
    if (!empty($data['reservationPlatform'])) $prompt .= "Reservation Platform: " . $data['reservationPlatform'] . "\n";
}

if (!empty($data['desiredOutcome'])) {
    $prompt .= "Desired Outcome: " . $data['desiredOutcome'] . "\n";
}


if ($isPremium) {
    $prompt .= "This is a PREMIUM letter. ";
    if ($data['serviceType'] === 'Airline') {
        $prompt .= "Include references to relevant US DOT regulations (14 CFR Part 250 and 14 CFR Part 259) and FTC guidelines that support this refund request. ";
    } else {
        $prompt .= "Include references to relevant FTC guidelines and state consumer protection laws that support this refund request. ";
    }
    $prompt .= "The tone should be firm but polite, and optimized for maximum chance of approval. ";
    $prompt .= "Structure the letter professionally with clear paragraphs and a formal closing. ";
    $prompt .= "Include specific compensation amounts and legal precedents where applicable. ";
    $prompt .= "Reference the Montreal Convention if it's an international flight.";
} else {
    $prompt .= "This is a FREE letter. Write a concise but effective letter requesting a refund or compensation. ";
    $prompt .= "Use a polite but firm tone and structure it properly. Keep it brief but professional.";
}

$prompt .= "\n\nGenerate only the body content of the letter (no date, addresses, or signature - those will be added separately).";

// Try to use OpenAI API
$letter_content = '';
if ($openai_api_key && $openai_api_key !== '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') {
    $letter_content = generateWithOpenAI($prompt, $openai_api_key);
}

// Fallback to template if OpenAI fails or no API key
if (!$letter_content) {
    $letter_content = generateRefundLetter($data, $isPremium);
}

// Add header and signature
$formattedLetter = "Date: " . date('F j, Y') . "\n\n";
$formattedLetter .= "To: Customer Service Department\n";
$formattedLetter .= $data['companyName'] . "\n\n";
$formattedLetter .= "Subject: Refund Request for Booking " . $data['bookingNumber'] . "\n\n";
$formattedLetter .= "Dear {$data['companyName']} Customer Service Team,\n\n"; // Changed greeting to use companyName from data
$formattedLetter .= $letter_content . "\n\n";
$formattedLetter .= "Sincerely,\n";
$formattedLetter .= $data['fullName'];

echo json_encode(['success' => true, 'letter' => $formattedLetter]);

function generateWithOpenAI($prompt, $api_key) {
    $url = 'https://api.openai.com/v1/chat/completions';

    $data = [
        'model' => 'gpt-4',
        'messages' => [
            [
                'role' => 'system',
                'content' => 'You are a professional legal writer specializing in consumer rights and refund requests. Always adhere strictly to the instructions in the user prompt regarding tone, content, and formatting. Ensure that premium requests include specific legal references and are optimized for maximum chance of approval.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 1500, // Increased max_tokens to accommodate more detailed letters
        'temperature' => 0.7
    ];

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200) {
        $result = json_decode($response, true);
        if (isset($result['choices'][0]['message']['content'])) {
            // Clean up potential extra whitespace or formatting from OpenAI
            $content = trim($result['choices'][0]['message']['content']);
            // Ensure the letter starts with a greeting if the prompt implies it, otherwise just return the content.
            // Based on the prompt, we expect only the body content.
            return $content;
        }
    }

    // Log error or return false if API call failed
    error_log("OpenAI API Error: HTTP Code - {$http_code}, Response - {$response}");
    return false;
}

?>