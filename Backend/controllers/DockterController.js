const DoctoerModel = require('../models/Doctorschem');
const CompnaeringPassword = require('../utils/ComparingPassword');
const DoctorValidationWithWebsite = require('../utils/DoctorValidationWithWebsite');
const PatientModel = require('../models/PatientSchema');
const mongoose = require('mongoose');

const temCotroller = async (req, res) => {
    try {
        if (!req.userData) {
            return res.send(400).send({ result: false, message: "User is not authticated" });
        }

        res.status(200).send({ result: true, user: req.userData });
    } catch (err) {
        console.log(err);
        next({ status: 500, message: "Server side error" });
    }
}
const Registrationdoctor = async (req, res) => {
    try {

        let { firstname, middelname, lastname, registrationnumber, yearofregistration, statemedicalcouncil, addressofhospital, password, cpassword, phonenumber, hostpitalname } = req.body;
        const existUser = await DoctoerModel.findOne({ registrationnumber });

        if (existUser) {
            return res.status(409).send({ result: false, message: "User already exists" });
        }

        if (password != cpassword) {
            return res.status(401).send({ result: false, message: "Passwords do not match. Please try again." });
        }
        //checking the validation of the doctor with web scraping
        const validateDoctor = await DoctorValidationWithWebsite({ Doctorname: `${firstname.toLowerCase()} ${middelname.toLowerCase()} ${lastname.toLowerCase()}`, RegistrtionNumber: registrationnumber, userYear: yearofregistration, userStateCouncil: statemedicalcouncil });

        if (!validateDoctor) {
            return res.status(401).send({ result: false, message: "Give correct details of registration number with munciple conusile" });

        }

        //Web scraping for the cheking of the doctor
        console.log("The name of the hostpital will be as per I decide yoooo", hostpitalname);
        const newDoctoruser = await DoctoerModel.create({ fullname: { firstname, middelname, lastname }, registrationnumber, yearofregistration, hostpitalname, statemedicalcouncil, addressofhospital, password, cpassword, phonenumber, });

        newDoctoruser.save();
        const token = await newDoctoruser.generateTokenForDoctor();
        res.status(200).send({ result: true, message: "User is registered sucessfully", token });

    } catch (e) {
        console.log(e);
        next({
            status: 400,
            message: "Login unsuccessful server side error",
        })
    }
}

const loginOfDoctor = async (req, res) => {
    try {
        const { registrationnumber, password } = req.body;
        const user = await DoctoerModel.findOne({ registrationnumber });
        if (!user) {
            return res.status(404).send({ result: false, message: "User not exists" })
        }
        const isMatch = await CompnaeringPassword(password, user.password);
        if (!isMatch) {
            return res.status(404).send({ result: false, message: "Enter correct cerditilas" });
        }

        const token = await user.generateTokenForDoctor();
        // console.log("Token of doctor is ", token);
        res.status(200).send({ result: true, message: "Login sucessfully", token });


    } catch (e) {
        console.log(e);
        next({
            status: 400,
            message: "Login unsuccessful server side error",
        })
    }
}

const uploadingFile = async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).send({ result: false, message: "File not found at backend" })
        }
        if (!req.body.aadharcardnumber) {
            return res.status(400).send({ result: false, message: "Aadharcardnumber not found" });

        }

        const userFileUpload = await PatientModel.findOne({ aadharcardnumber: req.body.aadharcardnumber });
        if (!userFileUpload) {
            res.status(404).send({ result: false, message: "User not found with the aadharcard" });
        }
        if (userFileUpload.pdfdocumnetslist.find(fileDetail => fileDetail.orginalname === req.file.originalname)) {
            return res.status(404).send({ result: false, message: "File alredy exist" });
        }
        // console.log(userFileUpload);
        // console.log(req.file.id);
        // console.log(req.file.filename);
        const newListPdfs = userFileUpload.pdfdocumnetslist.concat({
            _id: req.file.id.valueOf(),
            filename: req.file.filename,
            orginalname: req.file.originalname
        });

        // console.log(newListPdfs);

        const changeduser = await PatientModel.findOneAndUpdate({
            aadharcardnumber: req.body.aadharcardnumber
        }, { $set: { pdfdocumnetslist: newListPdfs } });

        // console.log(changeduser);
        if (!changeduser) {
            return res.status(400).send({ result: false, message: "File been added but user is not updated" });
        }

        res.status(200).send({ result: true, message: "File added " });




    } catch (e) {
        console.log(e);
        // next({ status: 500 });
        next({
            status: 400,
            message: "Serevr side error and we can not upload the file",
        })

    }
}

const addAppointment = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(404).send({ result: false, message: "Enter all data required for the appointment" });
        }
        const { registrtionNumber, patientAadharNo, hospitalName, department, appointmentDate, timeSlot, problem } = req.body;


        const userToFindAppointmnet = await PatientModel.findOne({ aadharcardnumber: patientAadharNo });

        if (!userToFindAppointmnet) {
            return res.status(404).send({ result: false, message: "Patient with give aadharnumber is not exsits" });
        }
        const upadateDoctor = await DoctoerModel.findOne({ registrationnumber: registrtionNumber })

        if (upadateDoctor === null) {
            res.status(404).send({ result: false, message: "The registrati number is not valid for this number" });
            return;
        }
        const uniqueIdForAppoitment = new mongoose.Types.ObjectId();
        const updateListOfAppointment = upadateDoctor.appointmnets.concat({
            patientName: userToFindAppointmnet.fullname.firstname, appointmentDate: appointmentDate, time: timeSlot, problem, patientAddharnumber: patientAadharNo, appointmentId: uniqueIdForAppoitment.toHexString()
        });

        // console.log(updateListOfAppointment);


        const updatedDoctor = await DoctoerModel.findOneAndUpdate({ registrationnumber: registrtionNumber }, { $set: { appointmnets: updateListOfAppointment } });
        // //Will be not used after jsonwebtoken
        // const deatilsOfDoctor = await DoctoerModel.findOne({ registrationnumber: registrtionNumber });
        if (!updatedDoctor) {

            return res.status(404).send({ result: false, message: "Appointment is not added" });
        }
        console.log(updatedDoctor);
        console.log(updatedDoctor.appointmnets.length);
        // const updateListOfPatientIdIs = updatedDoctor.appointmnets[updatedDoctor.appointmnets.length - 1]._id;

        // console.log("This is the appoinment id we have to create", uniqueIdForAppoitment.toHexString());

        const updatePatientAppointmentList = userToFindAppointmnet.appointmnets.concat({
            appointmentId: uniqueIdForAppoitment.toHexString(), hospitalName: upadateDoctor.hostpitalname, doctorName: { firstname: upadateDoctor.fullname.firstname, middelname: upadateDoctor.fullname.middelname, lastname: upadateDoctor.fullname.lastname }, department: department,
            appointmentDate: appointmentDate, time: timeSlot, problem: problem, addressofhospital: upadateDoctor.addressofhospital
        })

        const updatePaient = await PatientModel.findOneAndUpdate({ aadharcardnumber: patientAadharNo }, { $set: { appointmnets: updatePatientAppointmentList } })

        console.log(updatePaient);

        res.status(200).send({ result: true, message: "Appoinment is added" });














    } catch (e) {
        console.log(e);
        next({
            status: 400,
            message: "Serevr side error and appointment is not added",
        });
    }
}

const getTheListOfData = async (req, res) => {

    try {
        if (!req.body) {
            res.status(400).send({ result: false, message: "Addharcard is not recived" });
        }

        const { registrationnumber } = req.body;

        const userData = await DoctoerModel.findOne({ registrationnumber });
        console.log(userData.appointmnets);

        if (!userData) {
            res.status(400).send({ result: false, message: "User not found with this aadharcardnumber number" });
        }

        res.status(200).send({ result: true, list: userData.appointmnets });



    } catch (e) {
        console.log(e);
        // next({
        //     status: 500,
        //     message: "Serevr side error check backend"
        // })
        res.status(500).send({ reslut: false, message: "Serevr side error" });
    }
}

module.exports = { temCotroller, Registrationdoctor, loginOfDoctor, uploadingFile, addAppointment, getTheListOfData };