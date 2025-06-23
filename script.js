const API_TOKEN = "YOUR_HUGGING_FACE_API_TOKEN"; // Replace with your Hugging Face API token
const conversationDiv = document.getElementById("conversation");
const inputText = document.getElementById("inputText");
const statusP = document.getElementById("status");
const speakBtn = document.getElementById("speakBtn");
const characterSelect = document.getElementById("characterSelect");

let recognition = null;
let isRecognizing = false;

// AI Characters Configuration
const characters = {
  alex: {
    name: "Friendly Alex",
    prompt: "Respond in a warm, friendly, and supportive tone, like a close friend.",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex&hair=short01&hairColor=blonde",
  },
  emma: {
    name: "Wise Emma",
    prompt: "Respond in a thoughtful, insightful, and wise tone, offering deep perspectives.",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Emma&hair=long02&hairColor=brown",
  },
  max: {
    name: "Funny Max",
    prompt: "Respond in a humorous, witty, and playful tone, including light jokes.",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Max&hair=short03&hairColor=black",
  },
};

// Initialize Web Speech API (Speech Recognition)
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isRecognizing = true;
    speakBtn.textContent = "Listening...";
    speakBtn.classList.remove("bg-blue-500", "hover:bg-blue-600");
    speakBtn.classList.add("bg-red-500", "hover:bg-red-600");
    statusP.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        inputText.value = transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    statusP.textContent = interimTranscript ? `Hearing: ${interimTranscript}` : statusP.textContent;
  };

  recognition.onerror = (event) => {
    statusP.textContent = `Error: ${event.error}. Try again.`;
    stopRecognition();
  };

  recognition.onend = () => {
    stopRecognition();
  };
} else {
  speakBtn.disabled = true;
  speakBtn.textContent = "Speech Not Supported";
  statusP.textContent = "Speech recognition not supported in this browser.";
}

function startSpeechRecognition() {
  if (recognition && !isRecognizing) {
    recognition.start();
  } else if (isRecognizing) {
    recognition.stop();
  }
}

function stopRecognition() {
  if (isRecognizing) {
    recognition.stop();
    isRecognizing = false;
    speakBtn.textContent = "Speak";
    speakBtn.classList.remove("bg-red-500", "hover:bg-red-600");
    speakBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
    statusP.textContent = "Ready";
  }
}

async function queryHuggingFace(data, character) {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: `${characters[character].prompt}\nUser: ${data.inputs}`,
        }),
      }
    );
    const result = await response.json();
    if (result.error) {
      return `Error: ${result.error}`;
    }
    return result.generated_text || "No response available.";
  } catch (error) {
    return "Error: Failed to connect to API.";
  }
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text) {
    statusP.textContent = "Please enter or speak a message.";
    return;
  }

  // Display user message
  const userMessage = document.createElement("div");
  userMessage.className = "user flex justify-end items-start gap-2";
  userMessage.innerHTML = `
    <div class="text-right">
      <p class="font-semibold text-gray-700">You</p>
      <p>${text}</p>
    </div>
    <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=User" class="w-10 h-10 rounded-full" alt="User avatar">
  `;
  conversationDiv.appendChild(userMessage);
  conversationDiv.scrollTop = conversationDiv.scrollHeight;

  // Clear input
  inputText.value = "";
  statusP.textContent = "Processing...";

  // Get AI response
  const selectedCharacter = characterSelect.value;
  const aiResponse = await queryHuggingFace({ inputs: text }, selectedCharacter);

  // Display AI response
  const aiMessage = document.createElement("div");
  aiMessage.className = "ai flex justify-start items-start gap-2";
  aiMessage.innerHTML = `
    <img src="${characters[selectedCharacter].avatar}" class="w-10 h-10 rounded-full" alt="${characters[selectedCharacter].name} avatar">
    <div>
      <p class="font-semibold text-gray-700">${characters[selectedCharacter].name}</p>
      <p>${aiResponse}</p>
    </div>
  `;
  conversationDiv.appendChild(aiMessage);
  conversationDiv.scrollTop = conversationDiv.scrollHeight;

  statusP.textContent = "Ready";

  // Speak AI response
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(`${characters[selectedCharacter].name} says: ${aiResponse}`);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  } else {
    statusP.textContent = "Text-to-speech not supported in this browser.";
  }
}

function clearConversation() {
  conversationDiv.innerHTML = "";
  inputText.value = "";
  statusP.textContent = "Conversation cleared.";
}
