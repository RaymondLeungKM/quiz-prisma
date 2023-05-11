const express = require("express");
const cors = require("cors");
const auth = require("./auth");
import { APIRequest } from "./auth";
import { Response } from "express";
import { PrismaClient, User } from "@prisma/client";
const crypto = require("crypto");
// for generating a random hash
// console.log(crypto.randomBytes(64).toString('hex'))
// for generating password of a user
// const md5 = crypto.createHash('md5');
// const result = md5.update('abcd1234').digest('hex');
// console.log(result)
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");

function generateAccessToken(user: User) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "30s",
    }
  );
}

const submitQuizResult = async (
  correctCount: number,
  score: number,
  answers: Array<number>,
  correctAnswers: Array<number>,
  resultsArr: Array<Boolean>,
  quizId: number,
  userId: number,
  quizDate: Date
) => {
  try {
    let transformedAnswers = "";
    answers.forEach((answer) => {
      if (transformedAnswers == "") {
        transformedAnswers += answer;
      } else {
        transformedAnswers += `,${answer}`;
      }
    });
    let transformedCorrectAnswers = "";
    correctAnswers.forEach((answer) => {
      if (transformedCorrectAnswers == "") {
        transformedCorrectAnswers += answer;
      } else {
        transformedCorrectAnswers += `,${answer}`;
      }
    });
    let transformedResultsArr = "";
    resultsArr.forEach((result) => {
      if (transformedResultsArr == "") {
        transformedResultsArr += result;
      } else {
        transformedResultsArr += `,${result}`;
      }
    });
    const quiz_result = await prisma.quizResult.create({
      data: {
        correctCount: correctCount,
        score: score,
        answers: transformedAnswers,
        correctAnswers: transformedCorrectAnswers,
        resultsArr: transformedResultsArr,
        quizId: quizId,
        userId: userId,
        quiz_date: quizDate,
      },
    });
    return quiz_result;
  } catch (error) {
    console.log(error);
    throw new Error("Submit Quiz Result failed!");
  }
};

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.post("/token", async (req: APIRequest, res: Response) => {
  console.log("in post /token");
  try {
    const { refresh_token } = req.body;
    if (refresh_token == null) return res.sendStatus(401);
    const storedToken = await prisma.refresh_Tokens.findFirst({
      where: {
        refresh_token: refresh_token,
      },
    });
    if (storedToken == null) return res.sendStatus(403);
    jwt.verify(
      refresh_token,
      process.env.REFRESH_TOKEN_SECRET,
      (err: any, user: User) => {
        if (err) return res.sendStatus(403);
        const accessToken = generateAccessToken(user);
        res.json({ access_token: accessToken });
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error!");
  }
});

app.get("", (req: APIRequest, res: Response) => {
  res.status(200).send("Welcome to the Quiz App Server!");
});

app.get("/quiz", async (req: APIRequest, res: Response) => {
  const quizzes = await prisma.quiz.findMany({
    include: {
      category: true,
    },
  });
  res.status(200).json(quizzes);
});

app.get(
  "/quiz/result",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const user = req.user;
    try {
      const quiz_result = await prisma.quizResult.findMany({
        where: {
          userId: user.id,
        },
      });
      res.status(200).send({
        msg: "success",
        list: quiz_result,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.get("/quiz/:id", async (req: APIRequest, res: Response) => {
  const { id } = req.params;
  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: {
          equals: +id,
        },
      },
      include: {
        questions: {
          include: {
            answers: {
              select: {
                id: true,
                content: true,
                order: true,
                questionId: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        category: true,
      },
    });
    res.status(200).json(quiz);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error!");
  }
});

app.get(
  "/quiz/edit/:id",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { id } = req.params;
    try {
      const quiz = await prisma.quiz.findFirst({
        where: {
          id: {
            equals: +id,
          },
        },
        include: {
          questions: {
            include: {
              answers: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          category: true,
        },
      });
      res.status(200).json(quiz);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/quiz/delete/:id",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { id } = req.params;
    try {
      // delete answers => questions => quiz in this order
      // need to get all questionsId with quizId = id first
      const questions = await prisma.question.findMany({
        where: {
          quizId: +id,
        },
      });
      const questionIds = questions.map((question) => question.id);
      const deletedAnswers = await prisma.answer.deleteMany({
        where: {
          questionId: {
            in: questionIds,
          },
        },
      });
      const deletedQuestions = await prisma.question.deleteMany({
        where: {
          quizId: +id,
        },
      });
      const deletedQuiz = await prisma.quiz.delete({
        where: {
          id: +id,
        },
      });
      res.status(200).json({
        deletedQuizCount: deletedQuiz,
        deletedQuestionCount: deletedQuestions,
        deletedAnswerCount: deletedAnswers,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/quiz/add",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { quiz, questions, answers } = req.body;
    // console.log(quiz, questions, answers);
    try {
      const quizCategories = quiz.category;
      const categories = await prisma.category.findMany({
        where: {
          name: {
            in: quizCategories,
          },
        },
        select: {
          id: true,
        },
      });
      const newQuiz = await prisma.quiz.create({
        data: {
          quiz_name: quiz.quiz_name,
          category: {
            connect: categories,
          },
          duration: +quiz.duration,
          created_by: quiz.createdBy ? quiz.createdBy : "Raymond",
        },
      });
      // extract the id from the created quiz
      let index = 0;
      for await (const question of questions) {
        const newQuestion = await prisma.question.create({
          data: {
            title: question.title,
            order: +question.order,
            quizId: newQuiz.id,
            created_by: question.createdBy ? question.createdBy : "Raymond",
          },
        });
        const modifiedAnswerArr = answers[index].map(
          (answer: {
            content: string;
            order: number;
            isCorrect: Boolean;
            createdBy: string;
          }) => {
            return {
              content: answer.content,
              order: +answer.order,
              isCorrect: answer.isCorrect,
              questionId: newQuestion.id,
              created_by: answer.createdBy ? answer.createdBy : "Raymond",
            };
          }
        );
        // extract the id from the created question
        const newAnswerCount = await prisma.answer.createMany({
          data: modifiedAnswerArr,
        });
        index++;
      }
      const createdQuiz = await prisma.quiz.findFirst({
        where: {
          id: {
            equals: newQuiz.id,
          },
        },
        include: {
          questions: {
            include: {
              answers: {
                select: {
                  id: true,
                  content: true,
                  order: true,
                  questionId: true,
                },
              },
            },
          },
        },
      });
      console.log(createdQuiz);
      res.status(201).json(createdQuiz);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/quiz/edit",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { quiz, questions, answers } = req.body;

    // update quiz => question => answers in this order; actually might not need to be in this order as we already have the id of the related records
    // but wait.. we could have new questions and new answers... need to think of a way to do that..
    try {
      // also need to consider the case when deleting
      const quizCategories = quiz.category;
      const categories = await prisma.category.findMany({
        where: {
          name: {
            in: quizCategories,
          },
        },
        select: {
          id: true,
        },
      });
      const notInCategories = await prisma.category.findMany({
        where: {
          name: {
            notIn: quizCategories,
          },
        },
        select: {
          id: true,
        },
      });
      const updateQuiz = await prisma.quiz.update({
        where: {
          id: +quiz.id,
        },
        data: {
          quiz_name: quiz.quiz_name,
          category: {
            connect: categories,
            disconnect: notInCategories,
          },
          duration: +quiz.duration,
        },
      });
      console.log("updateQuiz=", updateQuiz);
      // update a particular question, or insert a new one if it doesnt exist
      let index = 0;
      // get the count of original number of questions for the quiz
      const originalQuestions = await prisma.question.findMany({
        where: {
          quizId: +quiz.id,
        },
      });
      const questionsCount = originalQuestions.length;
      const newQuestions = [];
      for await (const question of questions) {
        const upsertQuestion = await prisma.question.upsert({
          where: {
            quizId_order: {
              quizId: +quiz.id,
              order: +question.order,
            },
          },
          update: {
            title: question.title,
            order: +question.order,
          },
          create: {
            title: question.title,
            order: +question.order,
            quizId: +quiz.id,
            created_by: question.createdBy ? question.createdBy : "Raymond",
          },
        });
        newQuestions.push(upsertQuestion);
        const modifiedAnswerArr = answers[index].map(
          (answer: {
            content: string;
            order: number;
            isCorrect: Boolean;
            createdBy: string;
          }) => {
            return {
              content: answer.content,
              order: +answer.order,
              isCorrect: answer.isCorrect,
              questionId: upsertQuestion.id,
              created_by: answer.createdBy ? answer.createdBy : "Raymond",
            };
          }
        );

        let updateAnswer;
        // determine if the question is an existing one or a new one
        if (questions.length > questionsCount && index + 1 > questionsCount) {
          console.log("edit quiz => new question");
          // new question => create
          updateAnswer = await prisma.answer.createMany({
            data: modifiedAnswerArr,
          });
        } else {
          console.log("edit quiz => same question");
          // existing question => update
          const newAnswers = [];
          for await (const answer of modifiedAnswerArr) {
            updateAnswer = await prisma.answer.upsert({
              where: {
                questionId_order: {
                  questionId: upsertQuestion.id,
                  order: answer.order,
                },
              },
              update: {
                content: answer.content,
                isCorrect: answer.isCorrect,
              },
              create: {
                content: answer.content,
                order: +answer.order,
                isCorrect: answer.isCorrect,
                questionId: upsertQuestion.id,
                created_by: answer.createdBy ? answer.createdBy : "Raymond",
              },
            });
            newAnswers.push(updateAnswer);
          }
          // delete removed answers for this question
          const newAnswersIds = newAnswers.map((answer) => answer.id);
          const existingQuestionDeletedAnswersCount =
            await prisma.answer.deleteMany({
              where: {
                id: {
                  notIn: newAnswersIds,
                },
                questionId: upsertQuestion.id,
              },
            });
          console.log(
            "existingQuestionDeletedAnswersCount=",
            existingQuestionDeletedAnswersCount
          );
        }
        index++;
      }
      // delete removed questions for this quiz
      if (questions.length < questionsCount) {
        console.log("delete removed questions");
        const newQuestionIds = newQuestions.map((question) => question.id);
        // delete related answers first
        const deletedAnswersCount = await prisma.answer.deleteMany({
          where: {
            questionId: {
              notIn: newQuestionIds,
            },
          },
        });
        console.log("deletedAnswersCount=", deletedAnswersCount);
        // proceed to delete the questions
        const deletedQuestionsCount = await prisma.question.deleteMany({
          where: {
            id: {
              notIn: newQuestionIds,
            },
            quizId: updateQuiz.id,
          },
        });
        console.log("deletedQuestionsCount=", deletedQuestionsCount);
      }
      const updatedQuiz = await prisma.quiz.findFirst({
        where: {
          id: {
            equals: updateQuiz.id,
          },
        },
        include: {
          questions: {
            include: {
              answers: {
                select: {
                  id: true,
                  content: true,
                  order: true,
                  questionId: true,
                },
              },
            },
          },
        },
      });
      res.status(200).json(updatedQuiz);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/checkAnswers",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const user = req.user;
    const { id, answers } = req.body;
    console.log(answers);
    try {
      const quiz = await prisma.quiz.findFirst({
        where: {
          id: {
            equals: +id,
          },
        },
        include: {
          questions: {
            include: {
              answers: true,
            },
          },
        },
      });
      const resultsArr: boolean[] = [];
      let correctCount = 0;
      answers.forEach((answer: number | null, index: number) => {
        if (answer === null) {
          resultsArr.push(false);
        } else {
          const matchedAns = quiz!.questions[index].answers.find(
            (ans) => ans.id == +answer
          )!;
          if (matchedAns.isCorrect) {
            resultsArr.push(true);
            correctCount += 1;
          } else {
            resultsArr.push(false);
          }
        }
      });
      const correctAnswers = quiz!.questions.map((question) => {
        return question.answers.find((answer) => answer.isCorrect)!.id;
      });
      const score = (correctCount / answers.length) * 100;
      const quiz_result = submitQuizResult(
        correctCount,
        +score,
        answers,
        correctAnswers,
        resultsArr,
        +id,
        +user.id,
        new Date()
      );
      res.status(200).json({
        correctCount,
        score: score,
        list: resultsArr,
        correctAnswers,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.get("/category", async (req: APIRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({});
    res.status(200).json(categories);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error!");
  }
});

app.post(
  "/category/add",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { name, createdBy } = req.body;
    console.log(name);
    console.log(createdBy);
    try {
      const createdCategory = await prisma.category.create({
        data: {
          name: name,
          created_by: createdBy != "" ? createdBy : "Raymond",
        },
      });
      res.status(200).json(createdCategory);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/category/:id/edit",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { id, name, createdBy } = req.body;
    try {
      const updatedCategory = await prisma.category.update({
        data: {
          name: name,
          created_by: createdBy != "" ? createdBy : "Raymond",
        },
        where: {
          id: +id,
        },
      });
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post(
  "/category/delete/:id",
  auth.isAuthorized,
  async (req: APIRequest, res: Response) => {
    const { id } = req.params;
    console.log(id);
    try {
      const deletedCategory = await prisma.category.delete({
        where: {
          id: +id,
        },
      });
      res.status(200).json(deletedCategory);
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error!");
    }
  }
);

app.post("/register", async (req: APIRequest, res: Response) => {
  const { name, password, email } = req.body;

  if (!name) {
    return res.status(400).send({
      msg: "Username is required!",
    });
  } else if (!password) {
    return res.status(400).send({
      msg: "Password is required!",
    });
  } else if (!email) {
    return res.status(400).send({
      msg: "Email is required!",
    });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: {
          name: name,
          email: email,
        },
      },
    });
    if (existingUser != null) {
      return res.status(400).send({
        msg: "User already exist! Please use another username!",
      });
    }
    const md5 = crypto.createHash("md5");
    const encryptedPassword = md5.update(password).digest("hex");
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: encryptedPassword,
      },
    });
    const access_token = generateAccessToken({ ...newUser });
    const refresh_token = jwt.sign({ id: newUser.id, name: newUser.name }, process.env.REFRESH_TOKEN_SECRET);
    // save the refreshToken in DB
    res.status(200).send({
      msg: "User created successfully!",
      access_token: access_token,
      refresh_token: refresh_token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error!");
  }
});

app.post("/login", async (req: APIRequest, res: Response) => {
  const { name, password } = req.body;

  if (!name) {
    return res.status(400).send({
      msg: "Username is required!",
    });
  } else if (!password) {
    return res.status(400).send({
      msg: "Password is required!",
    });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        name: {
          equals: name,
        },
      },
    });

    if (user != null) {
      console.log(user);
      const md5 = crypto.createHash("md5");
      const encryptedPassword = md5.update(password).digest("hex");
      if (encryptedPassword == user.password) {
        const access_token = generateAccessToken({ ...user });
        const refresh_token = jwt.sign({ id: user.id, name: user.email }, process.env.REFRESH_TOKEN_SECRET);
        console.log("access_token=" + access_token);
        console.log("refresh_token=" + refresh_token);
        const savedRefreshToken = await prisma.refresh_Tokens.upsert({
          where: {
            refresh_token_userId: {
              refresh_token: refresh_token,
              userId: user.id,
            },
          },
          update: {
            refresh_token: refresh_token,
            userId: user.id,
          },
          create: {
            refresh_token: refresh_token,
            userId: user.id,
          },
        });
        res.status(200).send({
          msg: "Logged in successfully",
          access_token: access_token,
          refresh_token: refresh_token,
        });
      } else {
        res.status(401).send({
          msg: "Incorrect password!",
        });
      }
    } else {
      res.status(401).send({
        msg: "User not found!",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error!");
  }
});

const server = app.listen(3000, () => {
  console.log("Quiz Server started!");
});

// async function main() {
//     const Quiz = await prisma.quiz.findFirst({
//         where: {
//             id: {
//                 equals: 1
//             }
//         },
//         include: {
//             questions: {
//                 include: {
//                     answers: true
//                 }
//             }
//         }
//     })
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
