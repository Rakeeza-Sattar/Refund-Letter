<?php
header('Content-Type: application/json');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['fullName', 'email', 'companyName', 'bookingNumber', 'date', 'issueType', 'description'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'error' => "Field $field is required"]);
        exit;
    }
}

// Prepare the prompt for OpenAI
$isPremium = isset($data['isPremium']) && $data['isPremium'];
$prompt = "Write a professional refund request letter for a " . $data['issueType'] . " issue with " . $data['companyName'] . ".\n\n";
$prompt .= "Details:\n";
$prompt .= "Customer Name: " . $data['fullName'] . "\n";
$prompt .= "Booking/Ticket Number: " . $data['bookingNumber'] . "\n";
$prompt .= "Date of Travel/Stay: " . $data['date'] . "\n";
$prompt .= "Issue Description: " . $data['description'] . "\n\n";

if ($isPremium) {
    $prompt .= "Include references to relevant US DOT and FTC regulations that support this refund request. ";
    $prompt .= "The tone should be firm but polite, and optimized for maximum chance of approval. ";
    $prompt .= "Structure the letter professionally with clear paragraphs and a formal closing.";
} else {
    $prompt .= "Write a concise but effective letter requesting a refund or compensation. ";
    $prompt .= "Use a polite but firm tone and structure it properly.";
}

// For demo purposes, we'll generate a letter without OpenAI API
// You can replace this with your working OpenAI API key when available

// Generate a professional letter template
$letter = generateLetterTemplate($data, $isPremium);

// Add header and signature
$formattedLetter = "Date: " . date('Y-m-d') . "\n\n";
$formattedLetter .= $data['fullName'] . "\n";
$formattedLetter .= $data['email'] . "\n\n";
$formattedLetter .= "To: Customer Service\n";
$formattedLetter .= $data['companyName'] . "\n\n";
$formattedLetter .= "Subject: Refund Request for Booking " . $data['bookingNumber'] . "\n\n";
$formattedLetter .= "Dear Customer Service Team,\n\n";
$formattedLetter .= $letter . "\n\n";
$formattedLetter .= "Sincerely,\n";
$formattedLetter .= $data['fullName'] . "\n";

echo json_encode(['success' => true, 'letter' => $formattedLetter]);

function generateLetterTemplate($data, $isPremium) {
    $issueType = strtolower($data['issueType']);
    
    if ($isPremium) {
        $letter = "I am writing to formally request a full refund for my recent booking (Reference: " . $data['bookingNumber'] . ") due to a " . $data['issueType'] . " that occurred on " . $data['date'] . ".\n\n";
        
        $letter .= "Issue Details:\n" . $data['description'] . "\n\n";
        
        $letter .= "According to the U.S. Department of Transportation (DOT) regulations, specifically 14 CFR Part 250 and 14 CFR Part 259, passengers are entitled to compensation for significant delays and cancellations. Additionally, the Federal Trade Commission (FTC) guidelines on fair business practices support consumer rights to refunds when services are not delivered as promised.\n\n";
        
        $letter .= "I have been a loyal customer and believe this situation warrants immediate attention and full compensation. The inconvenience caused has resulted in additional expenses and significant disruption to my travel plans.\n\n";
        
        $letter .= "I respectfully request:\n";
        $letter .= "1. Full refund of the booking amount\n";
        $letter .= "2. Compensation for additional expenses incurred\n";
        $letter .= "3. Written confirmation of the refund process\n\n";
        
        $letter .= "I look forward to your prompt response within 7 business days. Should this matter not be resolved satisfactorily, I will be compelled to escalate this complaint to the appropriate regulatory authorities.\n\n";
        
        $letter .= "Thank you for your immediate attention to this matter.";
    } else {
        $letter = "I am writing to request a refund for my booking (Reference: " . $data['bookingNumber'] . ") due to a " . $data['issueType'] . " that occurred on " . $data['date'] . ".\n\n";
        
        $letter .= "Issue Details:\n" . $data['description'] . "\n\n";
        
        $letter .= "This situation has caused significant inconvenience and I believe a refund is appropriate given the circumstances. I have always been satisfied with your services and hope we can resolve this matter quickly.\n\n";
        
        $letter .= "I would appreciate a full refund of my booking amount and look forward to your response.\n\n";
        
        $letter .= "Thank you for your time and consideration.";
    }
    
    return $letter;
}
?>