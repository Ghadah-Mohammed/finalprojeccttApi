const express = require("express")
const router = express.Router()
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { signupJoi, Company, loginJoi, profilCompanyJoi, profilEditCompanyJoi } = require("../models/Company")
const validateBody = require("../middleware/validateBody")
const checkCompany = require("../middleware/checkCompany")
const checkUser = require("../middleware/checkUser")
const { offerJoi, Offer } = require("../models/Offer")
const { Project, projectAddJoi } = require("../models/Project")
const { Engineer, engineerJoi } = require("../models/Engineer")
const checkId = require("../middleware/checkId")
const checkAdmin = require("../middleware/checkAdmin")
const validateId = require("../middleware/validateId")

const req = require("express/lib/request")

router.get("/profile", checkCompany, async (req, res) => {
  const companies = await Company.findById(req.companyId).populate("project").populate("offer")
  res.json(companies)
})

//show company verfy
// router.get("/",async(req,res)=>{
//   const verfycompany=await Company.find({})
// })

//get engineer
router.get("/engineers", async (req, res) => {
  const engineers = await Engineer.find()
  res.json(engineers)
})

//addengineer
router.post("/add-engineer", checkCompany, validateBody(engineerJoi), async (req, res) => {
  const { name, photo } = req.body

  const engineer = new Engineer({
    name,
    photo,
  })
  await engineer.save()
  await Company.findByIdAndUpdate(req.companyId, { $push: { engineer: engineer._id } })

  res.json(engineer)
})

//signup Company
router.post("/signup", validateBody(signupJoi), async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body

    const companyFound = await Company.findOne({ email })
    if (companyFound) return res.status(400).send("company already register")

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    const company = new Company({
      name,
      email,
      password: hash,
      avatar,
      verified: false,
    })
    await company.save()

    res.json(company)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

router.get("/:companyId/verify", checkAdmin, validateId("companyId"), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: { verified: true } }, { new: true })
    if (!company) return res.status(400).send("company not found")
    res.json(company)
  } catch (error) {
    res.status(500).send(error.message)
  }
})
//login Company
router.post("/login", validateBody(loginJoi), async (req, res) => {
  try {
    const { email, password } = req.body
    const company = await Company.findOne({ email })
    if (!company) return res.status(400).send("company not found")

    const valid = await bcrypt.compare(password, company.password)
    if (!valid) return res.status(400).send("password incorrect")

    const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET_KEY, { expiresIn: "15d" })

    res.send(token)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

// router.get("/", async (req, res) => {
//   const companies = await Company.find()
//   res.json(companies)
// })

// router.get(":/allproject", async (req, res) => {
//   const project = await Project.find()
//   res.json(project)
// })

//getproject
router.get("/projects", checkCompany, async (req, res) => {
  const projects = await Project.find().populate("companyId")
  res.json(projects)
})

//get one project
router.get("/projects/:id", async (req, res) => {
  const projects = await Project.findById(req.params.id).populate("companyId")
  res.json(projects)
})

//get one company
router.get("/company/:id", async (req, res) => {
  const company = await Company.findById(req.params.id)
  res.json(company)
})

//get profile
// router.get("/getprofile", checkCompany, async (req, res) => {
//   const company = await Company.findById(req.companyId)
//   res.json(company)
// })

//get engineer
router.get("/engineer", checkCompany, async (req, res) => {
  const engineers = await Engineer.find().populate("engineer")
  res.json(engineers)
})

router.post(":/profile", checkCompany, async (req, res) => {
  const { name, avatar, description, projects } = req.body
  try {
    const result = profilCompanyJoi.validate(req.body)
    if (!result.error) return res.status(400).send(result.error.details[0].message)

    const company = new Company({
      name,
      avatar,
      description,
      projects,
    })

    await company.save()
    res.json(company)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

router.put("/", checkCompany, validateBody(profilEditCompanyJoi), async (req, res) => {
  try {
    const { name, avatar, email, projects } = req.body

    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { $set: { name, avatar, email, projects } },
      { new: true }
    )
    if (!company) return res.status(400).send("project not found")
    res.json(company)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

//delet company
router.delete("/:id", checkAdmin, checkId, async (req, res) => {
  try {
    const company = await Company.findByIdAndRemove(req.params.id)
    if (!company) return res.status(404).send("company not found")
    res.send("company is remove")
  } catch (error) {
    res.status(500).send(error.message)
  }
})

router.post("/:companyId/sendoffer", checkUser, validateBody(offerJoi), async (req, res) => {
  const { title, description } = req.body
  const offer = new Offer({
    title,
    description,
    userId: req.userId,
    companyId: req.params.companyId,
    status: "pending",
  })
  await offer.save()
  await Company.findByIdAndUpdate(req.params.companyId, { $push: { offer: offer._id } })

  res.json(offer)
})

//answer company
router.post("/:offerId/answeroffer", checkCompany, async (req, res) => {
  const { status } = req.body
  const offer = await Offer.findByIdAndUpdate(
    req.params.offerId,
    {
      status,
    },
    { new: true }
  )

  res.json(offer)
})
//verfy company
router.get("/:id/verify", checkAdmin, async (req, res) => {
  const companies = await Company.findByIdAndUpdate(req.params.id, { $set: { verified: true } })
  res.json(companies)
})


//verifiedCompanies
router.get("/verifiedCompanies", async (req, res) => {
  const companies = await Company.find({verified:true})
    .populate("project")
    .populate("engineer")
    .populate({
      path: "project",
      select: "-__v",
      populate: {
        path: "comment",
      },
    })
    .populate({
      path: "project",
      select: "-__v",
      populate: {
        path: "likes",
      },
    })
  res.json(companies)
})


module.exports = router
