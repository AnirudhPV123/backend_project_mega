import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // steps
  // get user details from frontend
  // validate - not empty
  // check if user already exists: username,email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  // 1
  const { username, email, password, fullName } = req.body;

  // 2
  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fileds are required");
  }

  // 3
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // 4
  const avatarLocation = req.files?.avatar[0]?.path;

  let coverImageLocation;
//   if (req.files?.coverImage) {
//     coverImageLocation = req.files?.coverImage[0]?.path;
//   }

if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocation = req.files.coverImage[0].path
}

  if (!avatarLocation) {
    throw new ApiError(400, "Avatar file is required");
  }

  //   5
  const avatar = await uploadOnCloudinary(avatarLocation);
  const coverImage = await uploadOnCloudinary(coverImageLocation);

  if (!avatar) {
    throw ApiError(400, "Avatar file is required");
  }

  //   6
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 7
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 8
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 9
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

export { registerUser };
