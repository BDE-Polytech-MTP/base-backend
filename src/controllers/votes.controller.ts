import { ValidatorBuilder } from "../validation";
import * as httpCode from "../utils/http-code";
import { AuthenticationService, JWTClaims } from "../services";
import { VotesService, VotesErrorType } from "../services/vote.service";

export class VotesController {
  private static VOTE_VALIDATOR = ValidatorBuilder.new<{ liste: string }>()
    .requires("liste")
    .toBeString()
    .matching(/^allintech|toutankhatech|blanc|$/)
    .build();

  constructor(
    private authService: AuthenticationService,
    private votesService: VotesService
  ) {}

  async getVote(token?: string) {
    /* No token were given, we return an unauthorized error */
    if (!token) {
      return httpCode.unauthorized("You must be connected.");
    }

    /* We verify token validity */
    let jwtClaims: JWTClaims;
    try {
      jwtClaims = await this.authService.verifyToken(token);
    } catch (_) {
      return httpCode.forbidden("The given token is invalid.");
    }

    try {
      const vote = await this.votesService.getVote(jwtClaims.uuid);
      return httpCode.ok({ vote });
    } catch (e) {
      return httpCode.internalServerError(
        "Impossible to retrieve current vote"
      );
    }
  }

  async vote(body: object | null, token?: string) {
    /* No token were given, we return an unauthorized error */
    if (!token) {
      return httpCode.unauthorized("You must be connected.");
    }

    /* We verify token validity */
    let jwtClaims: JWTClaims;
    try {
      jwtClaims = await this.authService.verifyToken(token);
    } catch (_) {
      return httpCode.forbidden("The given token is invalid.");
    }

    const result = VotesController.VOTE_VALIDATOR.validate(body);

    if (!result.valid) {
      return httpCode.badRequest(result.error.message);
    }

    const liste = result.value.liste.length ? result.value.liste : null;

    try {
      await this.votesService.vote(liste, jwtClaims.uuid);
      return httpCode.ok({
        currentVoted: liste,
      });
    } catch (e) {
      if (e.type === VotesErrorType.INVALID_USER) {
        return httpCode.badRequest("You arent known from the database");
      }
      return httpCode.internalServerError("Unable to vote, sorry");
    }
  }
}
