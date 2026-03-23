"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useParams } from "next/navigation";
import Nav from "@/components/navbar/page";
import CopyRight from "@/components/copybar/page";
import Loader from "@/components/loader/page";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { FaMicrophoneAlt } from "react-icons/fa";
import { FaFilePowerpoint } from "react-icons/fa6";
import { toast } from 'sonner';
import ReactMarkdown from "react-markdown";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { AiOutlineEye } from "react-icons/ai";
import remarkGfm from "remark-gfm";


import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const LecturePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userRole, setUserRole] = useState("");
  const { id } = useParams(); // Get the lecture ID from the URL
  const [lectureDetails, setLectureDetails] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0); // Time in seconds
  const [transcript, setTranscript] = useState(""); // Store the final live transcript
  const [recognition, setRecognition] = useState<any>(null);
  const [notes, setNotes] = useState(null);
  const [qwiz, setQwiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [cheatSheet, setCheatSheet] = useState(null);
  const [buttonText, setButtonText] = useState("Generate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [buttonAnimation, setButtonAnimation] = useState("");
  const [isAccessible, setIsAccessible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [speechQueue, setSpeechQueue] = useState<SpeechSynthesisUtterance[]>([]);
  const [currentUtteranceIndex, setCurrentUtteranceIndex] = useState(0);
  const [speakingTabs, setSpeakingTabs] = useState<{ [key: string]: boolean }>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const pptInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (typeof window !== "undefined") {
      setSynth(window.speechSynthesis);
    }
  }, []);

  const splitTextIntoChunks = (text: string, chunkSize: number = 100) => {
    const regex = new RegExp(`.{1,${chunkSize}}(\\s|$)`, "g");
    return text.match(regex) || [];
  };


  const handleGenerateClick = async () => {
    try {
      setIsGenerating(true);
      setButtonAnimation("animating");

      // Helper: fetch + check for errors (handles HTML error pages too)
      const callGenerate = async (type: string) => {
        const res = await fetch("/api/users/generateResponse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, type }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Server error (${res.status}): ${text.slice(0, 200)}`);
        }
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Failed to generate ${type}`);
        }
        return json.output;
      };

      // Step 1: Notes
      setButtonText("Generating Notes...");
      const notes = await callGenerate("lectureNotes");
      setNotes(notes);

      // Step 2: Cheat Sheet
      setButtonText("Generating Cheat Sheet...");
      const cheatSheet = await callGenerate("cheatsheet");
      setCheatSheet(cheatSheet);

      // Step 3: Quiz
      setButtonText("Generating Quiz...");
      const qwiz = await callGenerate("quiz");
      setQwiz(qwiz);

      // Step 4: Scenario Questions
      setButtonText("Generating Scenario Q...");
      const flashcards = await callGenerate("flashcards");
      setFlashcards(flashcards);

      // Step 5: Save all generated content
      setButtonText("Saving Content...");
      const saveRes = await fetch("/api/users/saveGeneration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: lectureDetails?.lectureName,
          notes,
          qwiz,
          flashcards,
          cheatSheet,
        }),
      });
      const saveResult = await saveRes.json();
      if (saveResult.success) {
        toast.success("Generation Saved", {
          style: { background: "green", color: "white" },
        });
      } else {
        setButtonText("Error Saving Content");
      }

      setButtonText("Generate");
      setIsGenerating(false);
      setButtonAnimation("");
    } catch (error: any) {
      console.error("Error during content generation:", error);
      toast.error(error?.message || "An error occurred during generation.", {
        style: { background: "red", color: "white" },
      });
      setButtonText("Error occurred");
      setIsGenerating(false);
      setButtonAnimation("");
    }
  };



  const toggleAccessibility = () => {
    setIsAccessible(!isAccessible);
    // Implement actual accessibility features toggle logic here
  };

  const handlePPTUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so the same file can be re-selected if needed
    e.target.value = "";

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/parsePPT", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to extract PPT.", {
          style: { background: "red", color: "white" },
        });
        return;
      }

      setTranscript(result.text);
      toast.success("PPT extracted! Review the transcript and click Generate.", {
        style: { background: "green", color: "white" },
      });
    } catch (err) {
      toast.error("An error occurred while parsing the PPT.", {
        style: { background: "red", color: "white" },
      });
    } finally {
      setIsExtracting(false);
    }
  };


  const toggleSpeech = (tab: string, text: string) => {
    if (!synth) return;

    if (speakingTabs[tab]) {
      synth.cancel();
      setSpeakingTabs((prev) => ({ ...prev, [tab]: false })); // Stop speech for the specific tab
    } else {
      if (!text) return;
      const chunks = splitTextIntoChunks(text, 200);

      let utterances = chunks.map((chunk, index) => {
        let utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.onend = () => {
          if (index === chunks.length - 1) {
            setSpeakingTabs((prev) => ({ ...prev, [tab]: false })); // Reset when finished
          } else {
            synth.speak(utterances[index + 1]); // Speak next chunk
          }
        };
        return utterance;
      });

      setSpeechQueue(utterances);
      if (utterances.length > 0) {
        synth.speak(utterances[0]);
        setSpeakingTabs((prev) => ({ ...prev, [tab]: true })); // Mark this tab as speaking
      }
    }
  };




  // Using useRef to persist the timer across renders
  const timer = useRef<NodeJS.Timeout | null>(null);

  const saveTranscript = async () => {
    try {
      const response = await fetch("/api/users/saveTranscript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: lectureDetails?.lectureName,
          transcript,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message, {
          style: {
            background: 'green',
            color: 'white',
          },
        });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving transcript:", error);
      alert("An error occurred while saving the transcript.");
    }
  };

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const recognitionInstance = new window.webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        // Iterate through the results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript = event.results[i][0].transcript; // Store the last interim result
          }
        }

        // Only append final results once
        setTranscript((prevTranscript) => {
          if (finalTranscript.trim() && !prevTranscript.endsWith(finalTranscript.trim())) {
            return prevTranscript + " " + finalTranscript.trim();
          }
          return prevTranscript; // Avoid duplicate final text
        });
      };

      setRecognition(recognitionInstance);
    } else {
      console.error("Speech recognition is not supported in this browser.");
    }
  }, []);

  // Start timer when recording starts
  useEffect(() => {
    if (isRecording) {
      // Start the timer when recording begins
      timer.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1); // Increment time every second
      }, 1000);

      // Start Speech Recognition
      if (recognition) {
        recognition.start();
      }
    } else {
      // Stop the timer when recording is stopped
      if (timer.current) {
        clearInterval(timer.current);
      }
      setTime(0); // Reset the timer when the recording ends

      // Stop Speech Recognition
      if (recognition) {
        recognition.stop();
      }
    }

    // Cleanup the timer on component unmount or isRecording change
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [isRecording, recognition]);

  // Format the time as HH:MM:SS
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600); // Calculate hours
    const minutes = Math.floor((time % 3600) / 60); // Calculate remaining minutes
    const seconds = time % 60; // Calculate remaining seconds
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };


  const handleRecordClick = () => {
    setIsRecording(true); // Start recording
    setTime(0); // Reset the timer
  };

  const handleEndRecording = () => {
    setIsRecording(false); // Stop recording
  };

  // Format lecture time to DD/MM/YY and 24-hour format
  const formatLectureTime = (isoString: string) => {
    const date = new Date(isoString);
    const formattedDate = date.toLocaleDateString("en-IN"); // Format as DD/MM/YYYY
    const formattedTime = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // 24-hour format
    });
    return `${formattedDate} ${formattedTime}`;
  };

  // Function to remove Markdown syntax and extract plain text
  const stripMarkdown = (markdown: string) => {
    return markdown
      .replace(/[#_*~>]/g, "") // Remove Markdown formatting symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
      .replace(/!\[.*\]\(.*\)/g, "") // Remove images
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim();
  };

  const handleSave = async (title: string, content: string) => {
    if (!content) return;

    // Remove <br> tags before further processing
    let finalContent = content.replace(/<br\s*\/?>/g, "\n");

    // Convert to Braille if Accessibility Mode is ON
    if (isAccessible) {
      finalContent = convertToBraille(finalContent);
    }

    // Ensure Markdown formatting is preserved
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 28 })],
            }),
            ...finalContent.split("\n").map((line) =>
              new Paragraph({ children: [new TextRun(line)] })
            ),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `${title}${isAccessible ? "_braille" : ""}.docx`);
    });
  };



  const convertToBraille = (text: string) => {
    const brailleMap: { [key: string]: string } = {
      A: "⠁", B: "⠃", C: "⠉", D: "⠙", E: "⠑", F: "⠋", G: "⠛", H: "⠓", I: "⠊", J: "⠚",
      K: "⠅", L: "⠇", M: "⠍", N: "⠝", O: "⠕", P: "⠏", Q: "⠟", R: "⠗", S: "⠎", T: "⠞",
      U: "⠥", V: "⠧", W: "⠺", X: "⠭", Y: "⠽", Z: "⠵",

      // Numbers (Braille numbers are preceded by the number sign ⠼)
      "1": "⠼⠁", "2": "⠼⠃", "3": "⠼⠉", "4": "⠼⠙", "5": "⠼⠑",
      "6": "⠼⠋", "7": "⠼⠛", "8": "⠼⠓", "9": "⠼⠊", "0": "⠼⠚",

      // Punctuation
      " ": " ", ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖", "-": "⠤", ":": "⠒", ";": "⠆",
      "(": "⠶", ")": "⠶", "/": "⠌", "'": "⠄", "\"": "⠐⠦", "&": "⠯"
    };

    return text.toUpperCase().split("").map(char => brailleMap[char] || char).join("");
  };




  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("/api/users/me");
        const { data } = response.data;
        setUserDetails(data);
        setUserRole(data.role);
        setLoading(false);

        // Find the lecture based on the ID
        const lecture = data.lectures.find(
          (lecture: any) => lecture._id.toString() === id
        );

        if (lecture) {
          setLectureDetails({
            lectureId: lecture._id,
            lectureName: lecture.topic,
            LectureTime: formatLectureTime(lecture.createdAt),
          });

          // Set the transcript to the state if it exists
          setTranscript(lecture.transcript || "");
          setNotes(lecture.notes || "");
          setQwiz(lecture.qwiz || "");
          setFlashcards(lecture.flashcards || "");
          setCheatSheet(lecture.cheatSheet || "");
        } else {
          console.error("Lecture not found");
        }
      } catch (error) {
        expirylogout();
        router.push("/login");
      }
    };

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchUserData();
    }
  }, [router, id]);


  const expirylogout = async () => {
    try {
      await axios.get("/api/users/logout");
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!lectureDetails) {
    return (
      <div className="flex h-screen justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div>
      <div className="h-[100vh] pt-24">
        <Nav loading={loading} userRole={userRole} userDetails={userDetails} />
        <div
          className="h-[90%] dark:bg-[#212628] rounded-3xl ml-8 bg-white mr-8 overflow-y-auto"
          style={{ maxHeight: "90vh" }}
        >
          <div>
            <div className="text-xl ">
              <div className="pl-4 pt-4 font-bold flex justify-between items-center pr-6">
                {/* Lecture Name and Time */}
                <h1 className="italic text-3xl">
                  {lectureDetails.lectureName}{" "}
                  <span className="text-base lowercase">
                    {lectureDetails.LectureTime}
                  </span>
                </h1>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Accessibility Mode
                  </span>
                  <div className="relative group">
                    <label className="toggle-switch flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAccessible}
                        onChange={toggleAccessibility}
                        className="hidden"
                      />
                      <div className={`toggle-switch-background ${isAccessible ? "bg-blue-500" : "bg-gray-300"} w-12 h-6 rounded-full relative transition-all`}>
                        <div className={`toggle-switch-handle absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isAccessible ? "translate-x-6" : "translate-x-0"}`}></div>
                      </div>
                      <AiOutlineEye className={`text-lg ${isAccessible ? "text-blue-500" : "text-gray-500"}`} />
                    </label>
                  </div>
                </div>
              </div>

              {/* PPT Upload Bar */}
              <div className="ml-4 mr-4 mt-4 flex items-center gap-3">
                <input
                  ref={pptInputRef}
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  onChange={handlePPTUpload}
                />
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border border-[rgb(61,68,77)] dark:bg-[#0E0E0E] bg-[#E6E6E6] text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl px-5 py-5 text-base font-medium transition-all"
                  onClick={() => pptInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  <FaFilePowerpoint className="h-5 w-5 text-orange-500" />
                  {isExtracting ? "Extracting..." : "Upload PPT"}
                </Button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Upload a <span className="font-semibold">.pptx</span> file to auto-fill the transcript
                </span>
              </div>

              <div
                className={`h-16 border border-[rgb(61,68,77)] flex justify-center mt-4 dark:bg-[#0E0E0E] bg-[#E6E6E6] rounded-xl ml-4 mr-4`}
              >
                <Button
                  className={`h-12 border border-[rgb(61,68,77)] hover:bg-white bg-white mt-2 flex items-center justify-between gap-2 transition-all duration-500 ease-in-out ${isRecording ? "w-[98%] rounded-xl" : "w-80 rounded-[100px]"} `}
                  onClick={isRecording ? handleEndRecording : handleRecordClick}
                >
                  {/* Left Side: Mic Icon and Timer */}
                  <div
                    className={`flex items-center justify-start h-12 transition-all duration-500 ease-in-out ${isRecording ? "ml-0" : "ml-4"}`}
                  >
                    <FaMicrophoneAlt className="h-8 w-8 text-black" />
                    {/* Timer (moves with mic icon to the left when recording starts) */}
                    {isRecording && (
                      <div className="text-lg text-black font-semibold ml-4">
                        <span>{formatTime(time)}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle: Audio Wave Animation (Visible when recording) */}
                  {isRecording && (
                    <div className="boxvisionContainer flex justify-center items-center">
                      <div className="boxvision boxvision1"></div>
                      <div className="boxvision boxvision2"></div>
                      <div className="boxvision boxvision3"></div>
                      <div className="boxvision boxvision4"></div>
                      <div className="boxvision boxvision5"></div>
                      <div className="boxvision boxvision6"></div>
                      <div className="boxvision boxvision7"></div>
                      <div className="boxvision boxvision8"></div>
                      <div className="boxvision boxvision9"></div>
                      <div className="boxvision boxvision10"></div>
                      <div className="boxvision boxvision11"></div>
                      <div className="boxvision boxvision12"></div>
                      <div className="boxvision boxvision13"></div>
                      <div className="boxvision boxvision14"></div>
                      <div className="boxvision boxvision15"></div>
                      <div className="boxvision boxvision16"></div>
                      <div className="boxvision boxvision17"></div>
                      <div className="boxvision boxvision18"></div>
                      <div className="boxvision boxvision19"></div>
                      <div className="boxvision boxvision20"></div>
                      <div className="boxvision boxvision21"></div>
                      <div className="boxvision boxvision22"></div>
                      <div className="boxvision boxvision23"></div>
                      <div className="boxvision boxvision24"></div>
                      <div className="boxvision boxvision25"></div>
                      <div className="boxvision boxvision26"></div>
                      <div className="boxvision boxvision27"></div>
                      <div className="boxvision boxvision28"></div>
                      <div className="boxvision boxvision29"></div>
                      <div className="boxvision boxvision30"></div>
                      <div className="boxvision boxvision31"></div>
                      <div className="boxvision boxvision32"></div>
                      <div className="boxvision boxvision33"></div>
                      <div className="boxvision boxvision34"></div>
                      <div className="boxvision boxvision35"></div>
                      <div className="boxvision boxvision36"></div>
                      <div className="boxvision boxvision37"></div>
                      <div className="boxvision boxvision38"></div>
                      <div className="boxvision boxvision39"></div>
                      <div className="boxvision boxvision40"></div>
                      <div className="boxvision boxvision41"></div>
                      <div className="boxvision boxvision42"></div>
                      <div className="boxvision boxvision43"></div>
                      <div className="boxvision boxvision44"></div>
                      <div className="boxvision boxvision45"></div>
                      <div className="boxvision boxvision46"></div>
                      <div className="boxvision boxvision47"></div>
                      <div className="boxvision boxvision48"></div>
                      <div className="boxvision boxvision49"></div>
                      <div className="boxvision boxvision50"></div>
                    </div>
                  )}

                  {/* Text (changes to 'Stop Recording' and moves to the extreme right when recording starts) */}
                  <span
                    className={`transition-all text-black duration-500 ease-in-out ${isRecording
                      ? "mr-0 bg-black text-white px-6 py-2 rounded-xl text-sm"
                      : "mr-4 text-xl"
                      }`}
                  >
                    {isRecording ? "Stop Recording" : "Click to Record Lecture"}
                  </span>
                </Button>
              </div>

              <div className="ml-4 mt-2 font-bold">
                <Label className="text-lg">Lecture Transcript</Label>
              </div>
              <div className="relative border border-[rgb(61,68,77)] ml-4 mr-4 bg-[#E6E6E6] dark:bg-[#0E0E0E] rounded-xl">
                {isAccessible && transcript && (
                  <Button
                    className="absolute top-2 right-2 px-2 py-1 text-sm rounded-lg transition"
                    onClick={() => toggleSpeech("transcript", transcript)}
                  >
                    {speakingTabs["transcript"] ? "🔴" : "🔊"}
                  </Button>
                )}

                <Textarea
                  className="h-36 text-black dark:text-white pr-20 textarea-no-scrollbar" // Added padding to the right for the button
                  placeholder="Paste your transcript here."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)} // Allow manual editing
                />
                {/* Save Transcript Button */}

                {/* Buttons Wrapper */}
                <div className="absolute bottom-2 right-2 flex flex-wrap justify-end gap-2">
                  {/* Save Transcript Button */}
                  <Button className="px-4 py-2 rounded-lg text-sm transition" onClick={saveTranscript}>
                    Save Transcript
                  </Button>

                  {/* Single Download Button - Handles Normal & Braille Modes */}
                  {transcript && (
                    <Button
                      className="px-4 py-2 rounded-lg text-sm transition"
                      onClick={() => handleSave("Lecture Transcript", transcript)}
                    >
                      Download {isAccessible ? "Braille" : ""}
                    </Button>
                  )}
                </div>
              </div>


              <div className="ml-4 mr-4 mt-2 flex item-center justify-center">
                <Button
                  className={`w-[25%] text-lg ${isGenerating ? 'animating' : ''}`}
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                >
                  <FaWandMagicSparkles className={`mr-2 h-6 w-6 ${isGenerating ? 'button-icon' : ''}`} />
                  <span className={`${isGenerating ? 'button-text' : ''}`}>
                    {buttonText}
                  </span>
                </Button>
              </div>




              <div className="mb-3 border border-[rgb(61,68,77)] mt-2 ml-4 mr-4 bg-[#E6E6E6] dark:bg-[#0E0E0E] rounded-xl">
                <div className="ml-4 mr-4 bg-[#E6E6E6] dark:bg-[#0E0E0E] rounded-xl">
                  <div>
                    <Tabs defaultValue="notes" className="w-full flex flex-col items-center">
                      {/* Centered TabsList with 100% width */}
                      <TabsList className="w-[100%] text-black dark:text-white bg-[#FFFFFF] dark:bg-[#212628] mt-2 justify-center">
                        <TabsTrigger
                          className="w-[25%] border border-transparent data-[state=active]:border-[rgb(61,68,77)] data-[state=active]:rounded-md"
                          value="notes"
                        >
                          Notes
                        </TabsTrigger>
                        <TabsTrigger
                          className="w-[25%] border border-transparent data-[state=active]:border-[rgb(61,68,77)] data-[state=active]:rounded-md"
                          value="qwiz"
                        >
                          Qwiz
                        </TabsTrigger>
                        <TabsTrigger
                          className="w-[25%] border border-transparent data-[state=active]:border-[rgb(61,68,77)] data-[state=active]:rounded-md"
                          value="flashcards"
                        >
                          Scenario Questions
                        </TabsTrigger>
                        <TabsTrigger
                          className="w-[25%] border border-transparent data-[state=active]:border-[rgb(61,68,77)] data-[state=active]:rounded-md"
                          value="cheatsheet"
                        >
                          Cheat Sheet
                        </TabsTrigger>
                      </TabsList>
                      {/* Tab Content */}
                      <div className="w-[100%] bg-[#FFFFFF] dark:bg-[#212628] mt-2 mb-2 rounded-lg flex items-center justify-center">
                        <div className="w-full max-h-[482px] min-h-[120px] overflow-y-auto mb-2">

                          {/* Notes Tab */}
                          <TabsContent value="notes">
                            <div className="w-full relative">
                              {notes && (
                                <div className="absolute top-2 right-2 flex space-x-2">
                                  <Button className="font-semibold px-3 py-1" onClick={() => handleSave("Lecture Notes", notes)}>
                                    Download {isAccessible ? "Braille" : ""}
                                  </Button>
                                  {isAccessible && (
                                    <Button
                                      className="font-semibold px-3 py-1"
                                      onClick={() => toggleSpeech("notes", stripMarkdown(notes))}
                                    >
                                      {speakingTabs["notes"] ? "🔴" : "🔊"}
                                    </Button>
                                  )}
                                </div>
                              )}
                              {notes ? <ReactMarkdown className="px-2 text-sm" remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown> : <p className="px-2 text-sm text-gray-500">No notes available.</p>}
                            </div>
                          </TabsContent>




                          {/* Qwiz Tab */}
                          <TabsContent value="qwiz">
                            <div className="w-full relative">
                              {qwiz && (
                                <div className="absolute top-2 right-2 flex space-x-2">
                                  <Button className="font-semibold px-3 py-1" onClick={() => handleSave("Quiz", qwiz)}>
                                    Download {isAccessible ? "Braille" : ""}
                                  </Button>
                                  {isAccessible && (
                                    <Button
                                      className="font-semibold px-3 py-1"
                                      onClick={() => toggleSpeech("qwiz", stripMarkdown(qwiz))}
                                    >
                                      {speakingTabs["qwiz"] ? "🔴" : "🔊"}
                                    </Button>
                                  )}
                                </div>
                              )}
                              {qwiz ? <ReactMarkdown className="px-2 text-sm" remarkPlugins={[remarkGfm]}>{String(qwiz).replace(/<br\s*\/?>/g, "\n")}</ReactMarkdown> : <p className="px-2 text-sm text-gray-500">No quiz available.</p>}
                            </div>
                          </TabsContent>

                          {/* Flashcards Tab */}
                          <TabsContent value="flashcards">
                            <div className="w-full relative">
                              {flashcards && (
                                <div className="absolute top-2 right-2 flex space-x-2">
                                  <Button className="font-semibold px-3 py-1" onClick={() => handleSave("Scenario Questions", flashcards)}>
                                    Download {isAccessible ? "Braille" : ""}
                                  </Button>
                                  {isAccessible && (
                                    <Button
                                      className="font-semibold px-3 py-1"
                                      onClick={() => toggleSpeech("flashcards", stripMarkdown(flashcards))}
                                    >
                                      {speakingTabs["flashcards"] ? "🔴" : "🔊"}
                                    </Button>
                                  )}
                                </div>
                              )}
                              {flashcards ? <ReactMarkdown className="px-2 text-sm" remarkPlugins={[remarkGfm]}>{flashcards}</ReactMarkdown> : <p className="px-2 text-sm text-gray-500">No scenario-based questions available.</p>}
                            </div>
                          </TabsContent>

                          {/* Cheat Sheet Tab */}
                          <TabsContent value="cheatsheet">
                            <div className="w-full relative">
                              {cheatSheet && (
                                <div className="absolute top-2 right-2 flex space-x-2">
                                  <Button className="font-semibold px-3 py-1" onClick={() => handleSave("Cheat Sheet", cheatSheet)}>
                                    Download {isAccessible ? "Braille" : ""}
                                  </Button>
                                  {isAccessible && (
                                    <Button
                                      className="font-semibold px-3 py-1"
                                      onClick={() => toggleSpeech("cheatsheet", stripMarkdown(cheatSheet))}
                                    >
                                      {speakingTabs["cheatsheet"] ? "🔴" : "🔊"}
                                    </Button>
                                  )}
                                </div>
                              )}
                              {cheatSheet ? <ReactMarkdown className="px-2 text-sm" remarkPlugins={[remarkGfm]}>{cheatSheet}</ReactMarkdown> : <p className="px-2 text-sm text-gray-500">No cheat sheet available.</p>}
                            </div>
                          </TabsContent>

                        </div>
                      </div>
                    </Tabs>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
        <CopyRight />
      </div>
    </div>
  );
};

export default LecturePage;
