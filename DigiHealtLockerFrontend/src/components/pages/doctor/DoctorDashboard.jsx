import React, { useRef, useState } from 'react'
import DoctorHeader from './DoctorHeader'
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '../../../Store/AuthClient'
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import JSZip from 'jszip';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
const DoctorDashboard = () => {
  let { user } = useAuth();
  const patientAadharNoRef = useRef('');
  const otpRef = useRef('');
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [otpIsVrified, setOtpIsVrified] = useState(false);
  const [addharCard, setAadharNo] = useState();
  const [noFile, setFileHaveNo] = useState(false);
  const [pdfUrls, setPdfUrls] = useState([]);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  console.log(user);
  const generateOtp = async () => {
    try {
      const formData = {
        patientAadharNo: patientAadharNoRef.current.value
      };
      setAadharNo(patientAadharNoRef.current.value);
      console.log(formData);
      const response = await fetch("/api/gotp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)


      })
      if (response.status == 200) {
        setOtpGenerated(true);
      }

    } catch (e) {
      console.log(e);
    }
  }
  const verifyOtp = async () => {
    try {
      const formData = {
        otp: parseInt(otpRef.current.value, 10),
        patientAadharNo: addharCard
      };
      const response = await fetch("/api/votp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)


      })
      if (response.status != 200) {
        setOtpIsVrified(false);
      }

      if (response.status == 404) {
        setOtpIsVrified(true);
        setFileHaveNo(true);
      }

      if (response.status == 410) {
        setOtpGenerated(false);
      }


      const blob = await response.blob();

      const data = await JSZip.loadAsync(blob);
      console.log("The data will get:", data);

      const urls = [];
      await Promise.all(
        Object.keys(data.files).map(async (filename) => {
          const file = data.files[filename];
          console.log(file);
          if (filename.endsWith('.pdf')) {
            const url = URL.createObjectURL(await file.async('blob'));
            urls.push(url);
          }
        })
      );

      setPdfUrls(urls);
      setOtpIsVrified(true);
      setFileHaveNo(false);

      console.log(data);

    } catch (e) {
      console.log(e);
    }
  }

  const backToGenaretionOfOtp = () => {
    setOtpGenerated(false);
    setFileHaveNo(false);
    setOtpIsVrified(false);
  }

  return (

    <>
      <DoctorHeader />

      <div className="container mx-auto mt-10">
        <h1 className="text-3xl font-semibold text-center mb-8 text-teal-600">Documets of the Patient</h1>

        {
          otpGenerated ? otpIsVrified ? (noFile ? (<h1>There is no files to show</h1>) : (<div>
            <div className="mb-4">
              <button

                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded focus:outline-none focus:bg-teal-600" onClick={backToGenaretionOfOtp}
              >
                Check pdf of anoter patient documents
              </button>
            </div>
            {pdfUrls.length > 0 && (
              <div>
                {pdfUrls.map((url, index) => (
                  <div key={`pdf_${index}`}>
                    <Document
                      file={url}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    >
                      {Array.from(new Array(numPages), (el, index) => (
                        <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                      ))}
                    </Document>
                    <p>Page {pageNumber} of {numPages}</p>
                  </div>
                ))}
              </div>
            )}
          </div>))
            :
            (<div className="max-w-md mx-auto">
              <div className="mb-4">
                <label htmlFor="otp" className="block text-gray-700">OTP</label>
                <input
                  type="number"
                  name='otp'
                  id="otp"
                  ref={otpRef}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-teal-500"
                  required
                />
              </div >

              <div className="mb-4">
                <button

                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded focus:outline-none focus:bg-teal-600" onClick={verifyOtp}
                >
                  Verify OTP
                </button>
              </div>

            </div >)
            :
            (<div className="max-w-md mx-auto">
              <div className="mb-4">
                <label htmlFor="aadharNo" className="block text-gray-700">Patient Aadhar No</label>
                <input
                  type="text"
                  name='aadharcardnumber'
                  id="aadharNo"
                  ref={patientAadharNoRef}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="mb-4">
                <button

                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded focus:outline-none focus:bg-teal-600" onClick={generateOtp}
                >
                  Generate OTP
                </button>
              </div>

            </div>)
        }



      </div >
    </>
  )
}

export default DoctorDashboard