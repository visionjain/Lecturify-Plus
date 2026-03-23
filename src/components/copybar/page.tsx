import React from "react";
import { FaGithub, FaInstagram, FaLinkedin } from "react-icons/fa6";

const CopyRight = () => {
  return (
    <div>
      <div className="bg-[#FFFFFF] dark:bg-[#212628] rounded-3xl ml-8 mr-8 mt-3">
        <div className="h-10 flex items-center justify-center">
          © 2023-26 Lecturify + By Vision Jain
          <a
            href="https://github.com/visionjain"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4"
          >
            <FaGithub className="h-6 w-6 text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors" />
          </a>
          <a
            href="https://www.linkedin.com/in/visionjain/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4"
          >
            <FaLinkedin className="h-6 w-6 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-500 transition-colors" />
          </a>
          <a
            href="https://www.instagram.com/__vision.jain__/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4"
          >
            <FaInstagram className="h-6 w-6 text-pink-500 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-600 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default CopyRight;
