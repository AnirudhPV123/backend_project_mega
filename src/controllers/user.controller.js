import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access or refresh token"
    );
  }
};

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

  try {
    // 1
    const { username, email, password, fullName } = req.body;

    // 2
    if (
      [username, email, password, fullName].some(
        (field) => field?.trim() === ""
      )
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

    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocation = req.files.coverImage[0].path;
    }

    if (!avatarLocation) {
      throw new ApiError(400, "Avatar file is required");
    }

    //   5
    const avatar = await uploadOnCloudinary(avatarLocation);
    const coverImage = await uploadOnCloudinary(coverImageLocation);

    if (!avatar) {
      throw new ApiError(400, "Avatar file is required");
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
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    // 9
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered Successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  // 1
  const { username, email, password } = req.body;

  // 2
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // 3
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // 4
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // 5
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 6
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    { new: true } //by including this it return the updated values here no return
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }

    // This is still object destructuring assignment, but with the addition of renaming the refreshToken property to newRefreshToken using the colon : syntax.
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(decodedToken._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: { fullName, email },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Update account details successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while update account details"
    );
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get avatar path
  // upload on cloudinary
  // update avatar in db

  try {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
      throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: { avatar: avatar.url },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Update avatar successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while update avatar");
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // get coverImage path
  // upload on cloudinary
  // update coverImage in db

  try {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
      throw new ApiError(400, "coverImage file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
      throw new ApiError(400, "Error while uploading coverImage");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: { coverImage: coverImage.url },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Update coverImage successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while update coverImage");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
