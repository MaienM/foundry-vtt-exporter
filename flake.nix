{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }: flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShell = pkgs.mkShell {
        buildInputs = with pkgs; [
          dprint
          nodePackages.yarn
          nodejs
        ];
        shellHook = ''
          if ! [[ ":$PATH:" = *:"$PWD/node_modules/.bin":* ]]; then
            export PATH="$PWD/node_modules/.bin:$PATH"
          fi

          source .env
          (
            real_version="$(node --version | cut -c2-)"
            if [ "$NODE_VERSION" != "$real_version" ]; then
              >&2 echo "WARNING: Node version $NODE_VERSION is specified in .env, but the installed version is $real_version."
            fi
          )
        '';
      };
    }
  );
}
